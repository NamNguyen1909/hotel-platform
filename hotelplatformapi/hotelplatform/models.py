from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Sum
from cloudinary.models import CloudinaryField
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
        # FIX: Skip validation khi update specific fields (như status) để tránh lỗi
        skip_validation = kwargs.pop('skip_validation', False)
        update_fields = kwargs.get('update_fields', None)
        
        # Chỉ gọi full_clean() nếu:
        # - Không phải force_insert (dùng trong seed.py) 
        # - Không phải skip_validation
        # - Không phải update_fields specific (để tránh validation conflicts)
        if (not kwargs.get('force_insert', False) and 
            not skip_validation and 
            not update_fields):
            self.full_clean()
        super().save(*args, **kwargs)
        # Note: Trạng thái phòng sẽ được cập nhật qua signals
        # Note: Customer stats sẽ được cập nhật qua signals

    def check_in(self, actual_guest_count=None):
        """Phương thức này không còn được sử dụng vì check-in được xử lý qua API"""
        raise NotImplementedError("Check-in được xử lý qua API, không tạo RoomRental")

    def calculate_actual_price(self, actual_guest_count=None):
        """
        Tính giá thực tế dựa trên số khách thực tế - SỬ DỤNG LOGIC PHÂN BỔ THÔNG MINH
        """
        if not actual_guest_count:
            actual_guest_count = self.guest_count
        
        # SỬ DỤNG LOGIC PHÂN BỔ THÔNG MINH cho nhiều phòng
        rooms = list(self.rooms.all())
        if len(rooms) > 1:
            stay_days = (self.check_out_date - self.check_in_date).days
            pricing_result = self.calculate_price_for_multiple_rooms(rooms, actual_guest_count, stay_days)
            return pricing_result['total_price']
        
        # Logic cũ cho phòng đơn
        total_price = Decimal('0')
        for room in rooms:
            base_price = room.room_type.base_price
            stay_days = (self.check_out_date - self.check_in_date).days
            
            # Tính phụ thu nếu vượt quá số khách tối đa
            if actual_guest_count > room.room_type.max_guests:
                extra_guests = actual_guest_count - room.room_type.max_guests
                surcharge = base_price * (room.room_type.extra_guest_surcharge / 100) * extra_guests
                room_total = (base_price + surcharge) * stay_days
            else:
                room_total = base_price * stay_days
                
            total_price += room_total
        
        return total_price

    @classmethod
    def calculate_price_for_multiple_rooms(cls, rooms, guest_count, stay_days):
        """
        Tính giá cho booking nhiều phòng với thuật toán phân bổ khách tối ưu
        
        Thuật toán:
        1. Sắp xếp phòng theo max_guests giảm dần (phòng lớn trước)
        2. Phân bổ tối đa cho mỗi phòng không vượt quá max_guests
        3. Nếu còn khách dư, phân bổ đều tạo phụ thu
        
        Args:
            rooms: Danh sách các Room objects
            guest_count: Tổng số khách  
            stay_days: Số ngày lưu trú
            
        Returns:
            dict: {
                'total_price': Decimal,
                'guest_allocation': list,
                'calculation_details': list
            }
        """
        if not rooms or guest_count <= 0 or stay_days <= 0:
            return {
                'total_price': Decimal('0'),
                'guest_allocation': [],
                'calculation_details': []
            }
        
        # Sắp xếp phòng theo max_guests giảm dần để ưu tiên phòng lớn trước
        sorted_rooms = sorted(rooms, key=lambda r: r.room_type.max_guests, reverse=True)
        
        # Khởi tạo phân bổ khách
        guest_allocation = [0] * len(sorted_rooms)
        remaining_guests = guest_count
        
        # Bước 1: Phân bổ tối đa cho mỗi phòng không vượt quá max_guests
        for i, room in enumerate(sorted_rooms):
            max_guests = room.room_type.max_guests
            allocated = min(remaining_guests, max_guests)
            guest_allocation[i] = allocated
            remaining_guests -= allocated
            
            if remaining_guests == 0:
                break
        
        # Bước 2: Nếu còn khách dư, phân bổ đều cho các phòng (tạo phụ thu)
        if remaining_guests > 0:
            base_extra = remaining_guests // len(sorted_rooms)
            extra_remainder = remaining_guests % len(sorted_rooms)
            
            for i in range(len(sorted_rooms)):
                guest_allocation[i] += base_extra
                if i < extra_remainder:
                    guest_allocation[i] += 1
        
        # Tính giá cho từng phòng
        total_price = Decimal('0')
        calculation_details = []
        
        for i, room in enumerate(sorted_rooms):
            room_guests = guest_allocation[i]
            
            # Tính giá cho phòng này
            base_price = room.room_type.base_price
            max_guests = room.room_type.max_guests
            surcharge_rate = room.room_type.extra_guest_surcharge / 100
            
            if room_guests <= max_guests:
                # Không vượt quá sức chứa
                room_price = base_price
                excess_guests = 0
            else:
                # Có phụ thu
                excess_guests = room_guests - max_guests
                surcharge = base_price * surcharge_rate * excess_guests
                room_price = base_price + surcharge
            
            # Nhân với số ngày
            total_room_price = room_price * stay_days
            total_price += total_room_price
            
            calculation_details.append({
                'room_number': room.room_number,
                'room_type': room.room_type.name,
                'guests': room_guests,
                'max_guests': max_guests,
                'excess_guests': excess_guests,
                'base_price': base_price,
                'room_price_per_day': room_price,
                'total_room_price': total_room_price
            })
        
        return {
            'total_price': total_price,
            'guest_allocation': guest_allocation,
            'calculation_details': calculation_details
        }

# Phiếu thuê phòng
class RoomRental(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='rentals', null=True, blank=True)
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rentals', limit_choices_to={'role': 'customer'})
    rooms = models.ManyToManyField(Room, related_name='rentals')
    check_in_date = models.DateTimeField()
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
        
        # ROOM CAPACITY VALIDATION - Enhanced for production
        if self.pk:  # Chỉ kiểm tra rooms nếu bản ghi đã được lưu
            total_max_capacity = sum(room.room_type.max_guests for room in self.rooms.all())
            
            # VALIDATION: Nếu vượt quá 150% capacity tổng → chặn hoàn toàn
            if total_max_capacity > 0 and self.guest_count > total_max_capacity * 1.5:
                raise ValidationError(
                    f"Số khách ({self.guest_count}) vượt quá 150% sức chứa tổng của các phòng "
                    f"(tối đa: {int(total_max_capacity * 1.5)} khách cho {total_max_capacity} sức chứa cơ bản). "
                    f"Vui lòng kiểm tra lại."
                )
            
            # INFO: Nếu vượt capacity → sẽ có phụ thu (không chặn)
            for room in self.rooms.all():
                if self.guest_count > room.room_type.max_guests:
                    # Chỉ log warning, không chặn (cho phép phụ thu)
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(
                        f"Room {room.room_number}: {self.guest_count} guests > {room.room_type.max_guests} max_guests. "
                        f"Surcharge will apply: {room.room_type.extra_guest_surcharge}%"
                    )

    def save(self, *args, **kwargs):
        # FIX: Tránh validation conflicts khi tạo RoomRental từ check-in
        # Chỉ validate nếu đây là update (đã có pk) và rooms đã được set
        skip_validation = kwargs.pop('skip_validation', False)
        
        if not skip_validation and self.pk and self.rooms.exists():
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

