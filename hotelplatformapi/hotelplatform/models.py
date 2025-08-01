from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Sum
from cloudinary.models import CloudinaryField
import uuid
from decimal import Decimal
from datetime import timedelta
import logging

logger = logging.getLogger("hotelplatform")

# Quản lý người dùng tùy chỉnh
class UserManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email là bắt buộc.')
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(username, email, password, **extra_fields)

# Loại khách hàng
class CustomerType(models.TextChoices):
    NEW = 'new', 'Khách hàng mới'
    REGULAR = 'regular', 'Khách phổ thông'
    VIP = 'vip', 'Khách VIP'
    SUPER_VIP = 'super_vip', 'Khách siêu VIP'
    UNKNOWN = 'unknown', 'Không xác định'

# Trạng thái đặt phòng
class BookingStatus(models.TextChoices):
    PENDING = 'pending', 'Chờ xác nhận'
    CONFIRMED = 'confirmed', 'Đã xác nhận'
    CHECKED_IN = 'checked_in', 'Đã nhận phòng'
    CHECKED_OUT = 'checked_out', 'Đã trả phòng'
    CANCELLED = 'cancelled', 'Đã hủy'
    NO_SHOW = 'no_show', 'Không xuất hiện'

# Vai trò người dùng
class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('admin', 'Quản trị viên'),        
        ('owner', 'Chủ khách sạn'),
        ('staff', 'Nhân viên'),
        ('customer', 'Khách hàng'),

    )

    username = models.CharField(max_length=255, unique=True, db_index=True)
    email = models.EmailField(max_length=255, unique=True, db_index=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='customer')
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=15, null=True, blank=True)
    id_card = models.CharField(max_length=20, null=True, blank=True)  # CMND/CCCD
    address = models.TextField(null=True, blank=True)
    avatar = CloudinaryField('avatar', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    customer_type = models.CharField(max_length=20, choices=CustomerType.choices, default=CustomerType.NEW)

    total_bookings = models.PositiveIntegerField(default=0)

    total_spent = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    objects = UserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'full_name']

    class Meta:
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['created_at']),
            models.Index(fields=['customer_type']),
        ]

    def __str__(self):
        return self.full_name or self.username

    def update_customer_type(self):
        """Cập nhật loại khách hàng dựa trên số lần đặt phòng và tổng chi tiêu"""
        
        bookings_count = self.bookings.count()
        
        # Lấy tổng chi tiêu từ các payments đã thanh toán
        total_spent = self.payments.filter(status=True).aggregate(total=Sum('amount'))['total'] or 0
        
        self.total_bookings = bookings_count
        self.total_spent = total_spent
        
        # Cập nhật customer_type dựa trên tiêu chí
        if bookings_count >= 20 or total_spent >= 50000000:  # 50 triệu VND
            self.customer_type = CustomerType.SUPER_VIP
        elif bookings_count >= 10 or total_spent >= 20000000:  # 20 triệu VND
            self.customer_type = CustomerType.VIP
        elif bookings_count >= 3:
            self.customer_type = CustomerType.REGULAR
        else:
            self.customer_type = CustomerType.NEW
        
        self.save(update_fields=['total_bookings', 'total_spent', 'customer_type'])

# Loại phòng
class RoomType(models.Model):
    name = models.CharField(max_length=100, unique=True)  # Ví dụ: Phòng đơn, đôi, VIP
    description = models.TextField(null=True, blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    max_guests = models.PositiveIntegerField(default=3)
    extra_guest_surcharge = models.DecimalField(max_digits=5, decimal_places=2, default=25.00)  # Phụ thu 25% cho khách thứ 3
    amenities = models.TextField(null=True, blank=True)  # Tiện nghi: wifi, điều hòa, hồ bơi...

    def __str__(self):
        return self.name

# Phòng
class Room(models.Model):
    ROOM_STATUS = (
        ('available', 'Trống'),
        ('booked', 'Đã đặt'),
        ('occupied', 'Đang sử dụng'),
    )

    room_number = models.CharField(max_length=50, unique=True, db_index=True)
    room_type = models.ForeignKey(RoomType, on_delete=models.CASCADE, related_name='rooms')
    status = models.CharField(max_length=20, choices=ROOM_STATUS, default='available')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['room_number', 'status']),
        ]

    def __str__(self):
        return f"Phòng {self.room_number} ({self.room_type.name})"

    def get_primary_image(self):
        """Lấy ảnh chính của phòng"""
        primary_image = self.images.filter(is_primary=True).first()
        if primary_image:
            return primary_image.image
        # Nếu không có ảnh chính, lấy ảnh đầu tiên
        first_image = self.images.first()
        return first_image.image if first_image else None

    def get_all_images(self):
        """Lấy tất cả ảnh của phòng"""
        return self.images.all()

    def get_image_urls(self):
        """Lấy danh sách URL của tất cả ảnh"""
        return [img.image.url for img in self.images.all() if img.image]

# Ảnh phòng
class RoomImage(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='images')
    image = CloudinaryField('room_image', blank=True, null=True)
    caption = models.CharField(max_length=255, blank=True, null=True)  # Mô tả ảnh
    is_primary = models.BooleanField(default=False)  # Ảnh chính
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['room', 'is_primary']),
        ]
        ordering = ['-is_primary', 'created_at']

    def __str__(self):
        return f"Ảnh phòng {self.room.room_number} - {self.caption or 'Không có mô tả'}"

    def save(self, *args, **kwargs):
        # Nếu đây là ảnh chính, bỏ đánh dấu ảnh chính cũ
        if self.is_primary:
            RoomImage.objects.filter(room=self.room, is_primary=True).exclude(pk=self.pk).update(is_primary=False)
        super().save(*args, **kwargs)

# Đặt phòng
class Booking(models.Model):
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings', limit_choices_to={'role': 'customer'})
    rooms = models.ManyToManyField(Room, related_name='bookings')
    check_in_date = models.DateTimeField()
    check_out_date = models.DateTimeField()
    total_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    guest_count = models.PositiveIntegerField(validators=[MinValueValidator(1)])  # Tối thiểu 1 khách
    status = models.CharField(max_length=20, choices=BookingStatus.choices, default=BookingStatus.PENDING)
    special_requests = models.TextField(null=True, blank=True)  # Yêu cầu đặc biệt
    qr_code = CloudinaryField('qr_code', null=True, blank=True)  # Lưu mã QR
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, unique=True, db_index=True)  # UUID cho QR code
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(check_in_date__lt=models.F('check_out_date')),
                name='check_in_before_check_out'
            ),
            models.CheckConstraint(
                check=models.Q(check_in_date__lte=models.F('created_at') + timedelta(days=28)),
                name='check_in_within_28_days'
            ),
        ]
        indexes = [
            models.Index(fields=['customer', 'check_in_date']),
            models.Index(fields=['uuid']),
        ]

    def __str__(self):
        return f"Đặt phòng của {self.customer} từ {self.check_in_date} đến {self.check_out_date}"

    def clean(self):
        # Kiểm tra ngày
        if self.check_in_date and self.check_out_date:
            if self.check_in_date >= self.check_out_date:
                raise ValidationError("Ngày nhận phòng phải trước ngày trả phòng.")
            if self.check_in_date > timezone.now() + timedelta(days=28):
                raise ValidationError("Ngày nhận phòng không được vượt quá 28 ngày kể từ thời điểm đặt.")
        # Kiểm tra số lượng khách
        if self.guest_count <= 0:
            raise ValidationError("Số lượng khách phải lớn hơn 0.")
        # Không kiểm tra rooms trong clean() để tránh lỗi many-to-many

    def save(self, *args, **kwargs):
        # Chỉ gọi full_clean() nếu không phải force_insert (dùng trong seed.py)
        if not kwargs.get('force_insert', False):
            self.full_clean()
        super().save(*args, **kwargs)
        # Note: Trạng thái phòng sẽ được cập nhật qua signals
        # Note: Customer stats sẽ được cập nhật qua signals

    def generate_qr_code(self):
        """
        Tạo QR code cho booking
        """
        import qrcode
        import io
        from cloudinary.uploader import upload
        
        # Tạo data cho QR code
        qr_data = {
            'uuid': str(self.uuid),
            'booking_id': self.id,
            'customer_name': self.customer.full_name,
            'check_in_date': self.check_in_date.isoformat(),
            'rooms': [room.room_number for room in self.rooms.all()]
        }
        
        # Tạo QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(str(qr_data))
        qr.make(fit=True)
        
        # Convert to image
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Save to BytesIO
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        # Upload to Cloudinary
        result = upload(buffer, folder="qr_codes", resource_type="image")
        
        # Save URL to model
        self.qr_code = result['secure_url']
        self.save()
        
        return result['secure_url']

    def check_in(self, actual_guest_count=None):
        """Phương thức này không còn được sử dụng vì check-in được xử lý qua API"""
        raise NotImplementedError("Check-in được xử lý qua API, không tạo RoomRental")

    @classmethod
    def get_by_uuid(cls, uuid_str):
        """
        Lấy booking theo UUID
        """
        try:
            return cls.objects.get(uuid=uuid_str)
        except cls.DoesNotExist:
            return None

    def calculate_actual_price(self, actual_guest_count=None):
        """
        Tính giá thực tế dựa trên số khách thực tế
        """
        if not actual_guest_count:
            actual_guest_count = self.guest_count
        
        total_price = Decimal('0')
        
        for room in self.rooms.all():
            base_price = room.room_type.base_price
            
            # Tính phụ thu nếu vượt quá số khách tối đa
            if actual_guest_count > room.room_type.max_guests:
                extra_guests = actual_guest_count - room.room_type.max_guests
                surcharge = base_price * (room.room_type.extra_guest_surcharge / 100) * extra_guests
                total_price += base_price + surcharge
            else:
                total_price += base_price
        
        return total_price

# Phiếu thuê phòng
class RoomRental(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='rentals', null=True, blank=True)
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rentals', limit_choices_to={'role': 'customer'})
    rooms = models.ManyToManyField(Room, related_name='rentals')
    check_in_date = models.DateTimeField(auto_now_add=True)
    check_out_date = models.DateTimeField()
    actual_check_out_date = models.DateTimeField(null=True, blank=True)  # Ngày giờ thực tế khi checkout
    total_price = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    # total_price: Giá thực tế, tính toán khi check-out, dựa trên:
    # Thời gian lưu trú thực tế (check_out_date - check_in_date).
    # Số lượng khách thực tế (guest_count).
    # Phụ thu từ RoomType.extra_guest_surcharge (n% cho khách thứ x).
    guest_count = models.PositiveIntegerField(validators=[MinValueValidator(1)])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['customer', 'check_in_date']),
        ]

    def __str__(self):
        return f"Phiếu thuê của {self.customer} từ {self.check_in_date} đến {self.check_out_date}"

    def clean(self):
        if self.check_in_date is None or self.check_out_date is None:
            return  # Không kiểm tra nếu thiếu dữ liệu ngày
        if self.check_in_date >= self.check_out_date:
            raise ValidationError("Ngày nhận phòng phải trước ngày trả phòng.")
        if self.pk:  # Chỉ kiểm tra rooms nếu bản ghi đã được lưu
            for room in self.rooms.all():
                if self.guest_count > room.room_type.max_guests:
                    raise ValidationError(f"Phòng {room.room_number} chỉ chứa tối đa {room.room_type.max_guests} khách.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def check_out(self):
        """
        Hoàn tất việc trả phòng thực tế, tính toán giá cuối cùng và tạo thanh toán
        """
        if self.actual_check_out_date:
            raise ValidationError("Phiếu thuê phòng này đã được check-out.")

        self.actual_check_out_date = timezone.now()  # Ví dụ: 21:00 05/08/2025
        final_price = self.calculate_final_price()
        self.total_price = final_price
        self.save()

        # Tạo thanh toán nếu chưa có
        self.finalize_payment()
    
        return self.total_price

    def finalize_payment(self):
        """
        Tạo payment nếu chưa có payment cho rental này.
        """
        if not self.payments.exists():
            Payment.objects.create(
                rental=self,
                customer=self.customer,
                amount=self.total_price,
                payment_method='cash',  # mặc định cash, có thể sửa lại ở view
                status=False,
                transaction_id=f"PAY-{self.id}-{timezone.now().strftime('%Y%m%d%H%M%S')}"
            )

    def get_duration_days(self):
        """
        Lấy số ngày lưu trú thực tế
        """
        return (self.check_out_date - self.check_in_date).days

    def is_overdue(self):
        """
        Kiểm tra xem có quá hạn checkout không
        """
        return timezone.now() > self.check_out_date

    def calculate_final_price(self):
        """
        Tính giá cuối cùng dựa trên thời gian thực tế và số khách
        """
        total_price = Decimal('0')
        # Tính số ngày thực tế
        actual_days = (self.check_out_date - self.check_in_date).days
        if actual_days < 1:
            actual_days = 1  # Tối thiểu 1 ngày

        for room in self.rooms.all():
            base_price = room.room_type.base_price
            room_total = base_price * actual_days

            # Tính phụ thu nếu vượt quá số khách tối đa
            if self.guest_count > room.room_type.max_guests:
                extra_guests = self.guest_count - room.room_type.max_guests
                surcharge = base_price * (room.room_type.extra_guest_surcharge / 100) * extra_guests * actual_days
                room_total += surcharge

            total_price += room_total

        return total_price

# Thanh toán
# Được tạo khi khách check-out,Trường amount lưu tổng số tiền thanh toán cuối cùng, 
# dựa trên total_price của RoomRental, có thể điều chỉnh thêm nếu áp dụng mã giảm giá (discount_code).
class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = (
        ('stripe', 'Stripe'),
        ('vnpay', 'VNPay'),
        ('cash', 'Tiền mặt'),
    )

    rental = models.ForeignKey(RoomRental, on_delete=models.CASCADE, related_name='payments')
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments', limit_choices_to={'role': 'customer'})
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    status = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True) # Ngày giờ thanh toán, viết hàm tự động cập nhật khi status=True
    transaction_id = models.CharField(max_length=255, unique=True)
    discount_code = models.ForeignKey('DiscountCode', on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')
    created_at = models.DateTimeField(auto_now_add=True)


    class Meta:
        indexes = [
            models.Index(fields=['rental', 'status']),
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['transaction_id']),
        ]

    def save(self, *args, **kwargs):
        # Tự động gán customer từ rental nếu chưa có
        if not self.customer and self.rental:
            self.customer = self.rental.customer
        
        # Cập nhật paid_at khi status thành True
        if self.status and not self.paid_at:
            self.paid_at = timezone.now()
        
        super().save(*args, **kwargs)
        # Note: Customer stats sẽ được cập nhật qua signals

    def __str__(self):
        return f"Thanh toán {self.transaction_id} - {self.amount}"

# # Đánh giá
# class Review(models.Model):
#     rental = models.ForeignKey(RoomRental, on_delete=models.CASCADE, related_name='reviews')
#     customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews', limit_choices_to={'role': 'customer'})
#     rating = models.PositiveIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
#     comment = models.TextField(null=True, blank=True)
#     created_at = models.DateTimeField(auto_now_add=True)
#
#     class Meta:
#         indexes = [
#             models.Index(fields=['rental', 'customer']),
#         ]
#
#     def __str__(self):
#         return f"Đánh giá của {self.customer} - {self.rating} sao"

# Mã giảm giá
class DiscountCode(models.Model):
    code = models.CharField(max_length=50, unique=True, db_index=True)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))])
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField()
    max_uses = models.PositiveIntegerField(null=True, blank=True)
    used_count = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(valid_from__lte=models.F('valid_to')),
                name='valid_from_before_valid_to'
            ),
        ]
        indexes = [
            models.Index(fields=['code', 'is_active']),
        ]

    def __str__(self):
        return self.code

    def is_valid(self):
        now = timezone.now()
        if self.valid_from <= now <= self.valid_to and (self.max_uses is None or self.used_count < self.max_uses):
            return True
        return False

# Thông báo
class Notification(models.Model):
    NOTIFICATION_TYPES = (
        ('booking_confirmation', 'Xác nhận đặt phòng'),
        ('check_in_reminder', 'Nhắc nhở nhận phòng'),
        ('check_out_reminder', 'Nhắc nhở trả phòng'),
        ('promotion', 'Khuyến mãi'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            models.Index(fields=['user', 'created_at']),
        ]
        ordering = ['-created_at']

    def __str__(self):
        return self.title

# Tin nhắn trò chuyện
# class ChatMessage(models.Model):
#     sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
#     receiver = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='received_messages')
#     booking = models.ForeignKey(Booking, on_delete=models.CASCADE, null=True, blank=True, related_name='chat_messages')
#     message = models.TextField()
#     created_at = models.DateTimeField(auto_now_add=True)
#
#     class Meta:
#         indexes = [
#             models.Index(fields=['booking', 'created_at']),
#             models.Index(fields=['receiver', 'created_at']),
#         ]
#
#     def __str__(self):
#         return f"Tin nhắn từ {self.sender} đến {self.receiver or 'nhóm'}"
#             models.Index(fields=['booking', 'created_at']),
#             models.Index(fields=['receiver', 'created_at']),
#         ]
#
#     def __str__(self):
#         return f"Tin nhắn từ {self.sender} đến {self.receiver or 'nhóm'}"

