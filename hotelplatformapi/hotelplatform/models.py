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
        extra_fields.setdefault('role', 'hotel_owner')
        extra_fields.setdefault('is_active', True)
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(username, email, password, **extra_fields)

# Loại khách hàng
class CustomerType(models.TextChoices):
    DOMESTIC = 'domestic', 'Khách nội địa'
    FOREIGN = 'foreign', 'Khách nước ngoài'

# Vai trò người dùng
class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('customer', 'Khách hàng'),
        ('owner', 'Chủ khách sạn'),
        ('staff', 'Nhân viên'),
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

    objects = UserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email', 'full_name','id_card','phone','role']

    class Meta:
        indexes = [
            models.Index(fields=['role']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return self.full_name or self.username

# Loại phòng
class RoomType(models.Model):
    name = models.CharField(max_length=100, unique=True)  # Ví dụ: Phòng đơn, đôi, VIP
    description = models.TextField(null=True, blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    max_guests = models.PositiveIntegerField(default=3)
    extra_guest_surcharge = models.DecimalField(max_digits=5, decimal_places=2, default=25.00)  # Phụ thu 25% cho khách thứ 3
    foreign_guest_multiplier = models.DecimalField(max_digits=4, decimal_places=2, default=1.50)  # Hệ số 1.5 cho khách nước ngoài
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
    qr_code = CloudinaryField('qr_code', null=True, blank=True)  # Lưu mã QR
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
        if self.check_in_date >= self.check_out_date:
            raise ValidationError("Ngày nhận phòng phải trước ngày trả phòng.")
        if self.check_in_date > timezone.now() + timedelta(days=28):
            raise ValidationError("Ngày nhận phòng không được vượt quá 28 ngày kể từ thời điểm đặt.")
        for room in self.rooms.all():
            if room.status != 'available':
                raise ValidationError(f"Phòng {room.room_number} không khả dụng.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        # Cập nhật trạng thái phòng
        for room in self.rooms.all():
            room.status = 'booked'
            room.save()

# Phiếu thuê phòng
class RoomRental(models.Model):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='rentals', null=True, blank=True)
    customer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rentals', limit_choices_to={'role': 'customer'})
    rooms = models.ManyToManyField(Room, related_name='rentals')
    check_in_date = models.DateTimeField()
    check_out_date = models.DateTimeField()
    guest_count = models.PositiveIntegerField(validators=[MaxValueValidator(3)])  # Tối đa 3 khách/phòng
    guest_type = models.CharField(max_length=20, choices=CustomerType.choices, default=CustomerType.DOMESTIC)
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
        if self.guest_count > 3:
            raise ValidationError("Mỗi phòng tối đa 3 khách.")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        # Cập nhật trạng thái phòng
        for room in self.rooms.all():
            room.status = 'occupied'
            room.save()

# Thanh toán
class Payment(models.Model):
    PAYMENT_METHOD_CHOICES = (
        ('momo', 'MoMo'),
        ('vnpay', 'VNPay'),
        ('cash', 'Tiền mặt'),
    )

    rental = models.ForeignKey(RoomRental, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0'))])
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    status = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)
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

# # Mã giảm giá
# class DiscountCode(models.Model):
#     code = models.CharField(max_length=50, unique=True, db_index=True)
#     discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))])
#     valid_from = models.DateTimeField()
#     valid_to = models.DateTimeField()
#     max_uses = models.PositiveIntegerField(null=True, blank=True)
#     used_count = models.PositiveIntegerField(default=0)
#     is_active = models.BooleanField(default=True)
#
#     class Meta:
#         constraints = [
#             models.CheckConstraint(
#                 check=models.Q(valid_from__lte=models.F('valid_to')),
#                 name='valid_from_before_valid_to'
#             ),
#         ]
#         indexes = [
#             models.Index(fields=['code', 'is_active']),
#         ]
#
#     def __str__(self):
#         return self.code
#
#     def is_valid(self):
#         now = timezone.now()
#         if self.valid_from <= now <= self.valid_to and (self.max_uses is None or self.used_count < self.max_uses):
#             return True
#         return False

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

# Nhật ký thống kê phòng
class RoomUsageLog(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='usage_logs')
    month = models.DateField()  # Tháng thống kê
    days_occupied = models.PositiveIntegerField(default=0)
    revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    usage_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)  # Tỷ lệ sử dụng (%)

    class Meta:
        unique_together = ('room', 'month')
        indexes = [
            models.Index(fields=['room', 'month']),
        ]

    def __str__(self):
        return f"Thống kê phòng {self.room} - {self.month.strftime('%Y-%m')}"