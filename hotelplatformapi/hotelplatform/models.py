from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.core.exceptions import ValidationError
from cloudinary.models import CloudinaryField
import uuid
from decimal import Decimal
from datetime import timedelta

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

        total_spent = self.payments.filter(status=True).aggregate(total=Sum('final_amount'))['total'] or 0

        self.total_bookings = bookings_count

        self.total_spent = total_spent

        if bookings_count >= 20 or total_spent >= 5000:

            self.customer_type = CustomerType.SUPER_VIP

        elif bookings_count >= 10 or total_spent >= 2000:

            self.customer_type = CustomerType.VIP

        elif bookings_count >= 3:

            self.customer_type = CustomerType.REGULAR

        else:

            self.customer_type = CustomerType.NEW

        self.save()

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
        if self.check_in_date >= self.check_out_date:
            raise ValidationError("Ngày nhận phòng phải trước ngày trả phòng.")
        if self.check_in_date > timezone.now() + timedelta(days=28):
            raise ValidationError("Ngày nhận phòng không được vượt quá 28 ngày kể từ thời điểm đặt.")
        for room in self.rooms.all():
            if room.status != 'available':
                raise ValidationError(f"Phòng {room.room_number} không khả dụng.")

            if self.guest_count > room.room_type.max_guests:

                raise ValidationError(f"Phòng {room.room_number} chỉ chứa tối đa {room.room_type.max_guests} khách.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        # Cập nhật trạng thái phòng
        for room in self.rooms.all():
            room.status = 'booked'
            room.save()

        self.customer.update_customer_type()

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
        """
        Thực hiện check-in và tạo RoomRental
        """
        if self.status != BookingStatus.CONFIRMED:
            raise ValidationError("Booking chưa được xác nhận")
        
        # Tạo RoomRental
        rental = RoomRental.objects.create(
            booking=self,
            customer=self.customer,
            check_out_date=self.check_out_date,
            total_price=self.total_price,
            guest_count=actual_guest_count or self.guest_count,
        )
        
        # Thêm rooms
        rental.rooms.set(self.rooms.all())
        
        # Cập nhật status
        self.status = BookingStatus.CHECKED_IN
        self.save()
        
        return rental

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
        if self.check_in_date >= self.check_out_date:
            raise ValidationError("Ngày nhận phòng phải trước ngày trả phòng.")
        for room in self.rooms.all():
            if self.guest_count > room.room_type.max_guests:

                raise ValidationError(f"Phòng {room.room_number} chỉ chứa tối đa {room.room_type.max_guests} khách.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        # Cập nhật trạng thái phòng
        for room in self.rooms.all():
            room.status = 'occupied'
            room.save()
        if self.customer:

            self.customer.update_customer_type()

    def check_out(self, actual_check_out_date=None):
        """
        Thực hiện check-out và tính toán giá cuối cùng
        """
        if not actual_check_out_date:
            actual_check_out_date = timezone.now()
        
        self.check_out_date = actual_check_out_date
        
        # Tính toán lại giá dựa trên thời gian thực tế
        self.total_price = self.calculate_final_price()
        
        # Cập nhật booking status
        if self.booking:
            self.booking.status = BookingStatus.CHECKED_OUT
            self.booking.save()
        
        # Giải phóng phòng
        for room in self.rooms.all():
            room.status = 'available'
            room.save()
        
        self.save()
        
        return self.total_price

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
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    status = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True) # Ngày giờ thanh toán, viết hàm tự động cập nhật khi status=True
    transaction_id = models.CharField(max_length=255, unique=True)
    discount_code = models.ForeignKey('DiscountCode', on_delete=models.SET_NULL, null=True, blank=True, related_name='payments')

    class Meta:
        indexes = [
            models.Index(fields=['rental', 'status']),
            models.Index(fields=['transaction_id']),
        ]

    def save(self, *args, **kwargs):
        if self.status and not self.paid_at:
            self.paid_at = timezone.now()
        super().save(*args, **kwargs)

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

