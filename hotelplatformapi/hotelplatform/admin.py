from django.contrib import admin
from django.db.models import Count, Q, Sum
from django.template.response import TemplateResponse
from django.utils.safestring import mark_safe
from django import forms
from django.urls import path
from django.utils import timezone
from datetime import datetime, timedelta
from .models import (
    User, RoomType, Room, Booking, RoomRental, Payment, DiscountCode, Notification
)

# Form tùy chỉnh cho User
class UserForm(forms.ModelForm):
    password = forms.CharField(
        widget=forms.PasswordInput(attrs={'placeholder': 'Nhập mật khẩu'}),
        help_text="Mật khẩu sẽ được mã hóa tự động",
        required=False
    )
    
    class Meta:
        model = User
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Nếu đang chỉnh sửa user (có instance), ẩn trường password
        if self.instance and self.instance.pk:
            self.fields.pop('password', None)

    def clean_password(self):
        password = self.cleaned_data.get('password')
        if password and len(password) < 6:
            raise forms.ValidationError("Mật khẩu phải có ít nhất 6 ký tự")
        return password

# Form tùy chỉnh cho Booking
class BookingForm(forms.ModelForm):
    special_requests = forms.CharField(widget=forms.Textarea(attrs={'rows': 3}), required=False)

    class Meta:
        model = Booking
        fields = '__all__'

# Form tùy chỉnh cho Notification
class NotificationForm(forms.ModelForm):
    message = forms.CharField(widget=forms.Textarea(attrs={'rows': 4}), required=False)

    class Meta:
        model = Notification
        fields = '__all__'

# Admin cho User
class UserAdmin(admin.ModelAdmin):
    list_display = ['id', 'username', 'email', 'full_name', 'role', 'phone', 'is_active', 'created_at']
    search_fields = ['username', 'email', 'full_name', 'phone', 'id_card']
    list_filter = ['role', 'is_active', 'created_at']
    readonly_fields = ['avatar_view', 'created_at', 'updated_at']
    list_per_page = 20
    form = UserForm
    
    # Fieldsets cho form thêm mới
    add_fieldsets = (
        ('Thông tin cơ bản', {
            'fields': ('username', 'email', 'password', 'full_name', 'role')
        }),
        ('Thông tin liên hệ', {
            'fields': ('phone', 'id_card', 'address')
        }),
        ('Hình ảnh', {
            'fields': ('avatar',)
        }),
        ('Trạng thái', {
            'fields': ('is_active', 'is_staff', 'is_superuser')
        }),
    )
    
    # Fieldsets cho form chỉnh sửa
    fieldsets = (
        ('Thông tin cơ bản', {
            'fields': ('username', 'email', 'full_name', 'role')
        }),
        ('Thông tin liên hệ', {
            'fields': ('phone', 'id_card', 'address')
        }),
        ('Hình ảnh', {
            'fields': ('avatar', 'avatar_view')
        }),
        ('Trạng thái', {
            'fields': ('is_active', 'is_staff', 'is_superuser')
        }),
        ('Thời gian', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

    def get_fieldsets(self, request, obj=None):
        if not obj:  # Tạo mới
            return self.add_fieldsets
        return super().get_fieldsets(request, obj)

    def save_model(self, request, obj, form, change):
        if not change and 'password' in form.cleaned_data and form.cleaned_data['password']:
            # Mã hóa mật khẩu khi tạo user mới
            obj.set_password(form.cleaned_data['password'])
        super().save_model(request, obj, form, change)

    def avatar_view(self, user):
        if user.avatar:
            return mark_safe(f"<img src='{user.avatar.url}' width='200' />")
        return "Không có ảnh đại diện"
    avatar_view.short_description = "Avatar Preview"

    def get_queryset(self, request):
        return super().get_queryset(request)

# Admin cho RoomType
class RoomTypeAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'base_price', 'max_guests', 'extra_guest_surcharge']
    search_fields = ['name', 'description']
    list_filter = ['max_guests', 'base_price']
    list_per_page = 20
    fieldsets = (
        ('Thông tin cơ bản', {
            'fields': ('name', 'description')
        }),
        ('Giá cả', {
            'fields': ('base_price', 'extra_guest_surcharge')
        }),
        ('Khách hàng', {
            'fields': ('max_guests',)
        }),
        ('Tiện nghi', {
            'fields': ('amenities',)
        })
    )

# Admin cho Room
class RoomAdmin(admin.ModelAdmin):
    list_display = ['id', 'room_number', 'room_type', 'status', 'created_at']
    search_fields = ['room_number', 'room_type__name']
    list_filter = ['room_type', 'status', 'created_at']
    list_editable = ['status']
    list_per_page = 20

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('room_type')

# Admin cho Booking
class BookingAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'customer_phone', 'check_in_date', 'check_out_date', 'total_price', 'guest_count', 'status', 'created_at']
    search_fields = ['customer__username', 'customer__full_name', 'customer__phone']
    list_filter = ['status', 'check_in_date', 'check_out_date', 'created_at']
    readonly_fields = ['qr_code_view', 'total_price_display']
    form = BookingForm
    list_per_page = 20
    date_hierarchy = 'check_in_date'

    def customer_phone(self, obj):
        return obj.customer.phone if obj.customer.phone else 'Chưa có'
    customer_phone.short_description = "Số điện thoại"

    def qr_code_view(self, booking):
        if booking.qr_code:
            return mark_safe(f"<img src='{booking.qr_code.url}' width='100' />")
        return "Không có QR code"
    qr_code_view.short_description = "QR Code"

    def total_price_display(self, obj):
        return f"{obj.total_price:,.0f} VNĐ"
    total_price_display.short_description = "Tổng giá"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('customer').prefetch_related('rooms')

    fieldsets = (
        ('Thông tin đặt phòng', {
            'fields': ('customer', 'rooms', 'check_in_date', 'check_out_date')
        }),
        ('Chi tiết', {
            'fields': ('total_price', 'total_price_display', 'guest_count', 'status')
        }),
        ('Yêu cầu đặc biệt', {
            'fields': ('special_requests',)
        }),
        ('QR Code', {
            'fields': ('qr_code', 'qr_code_view')
        })
    )

# Admin cho RoomRental
class RoomRentalAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'booking_id', 'check_in_date', 'check_out_date', 'total_price', 'guest_count', 'created_at']
    search_fields = ['customer__username', 'customer__full_name', 'booking__id']
    list_filter = ['check_in_date', 'check_out_date', 'created_at']
    readonly_fields = ['total_price_display', 'duration_display']
    list_per_page = 20
    date_hierarchy = 'check_in_date'

    def booking_id(self, obj):
        return obj.booking.id if obj.booking else 'Trực tiếp'
    booking_id.short_description = "Mã đặt phòng"

    def total_price_display(self, obj):
        return f"{obj.total_price:,.0f} VNĐ"
    total_price_display.short_description = "Tổng giá"

    def duration_display(self, obj):
        duration = obj.check_out_date - obj.check_in_date
        return f"{duration.days} ngày"
    duration_display.short_description = "Thời gian lưu trú"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('customer', 'booking').prefetch_related('rooms')

# Admin cho Payment
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'rental_customer', 'amount_display', 'payment_method', 'status', 'paid_at', 'transaction_id'
]
    search_fields = ['rental__customer__username', 'transaction_id']
    list_filter = ['payment_method', 'status', 'paid_at']
    readonly_fields = ['transaction_id', 'amount_display']
    list_per_page = 20
    date_hierarchy = 'paid_at'

    def rental_customer(self, obj):
        return obj.rental.customer.full_name
    rental_customer.short_description = "Khách hàng"

    def amount_display(self, obj):
        return f"{obj.amount:,.0f} VNĐ"
    amount_display.short_description = "Số tiền"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('rental__customer', 'discount_code')

# Admin cho DiscountCode
class DiscountCodeAdmin(admin.ModelAdmin):
    list_display = ['id', 'code', 'discount_percentage', 'valid_from', 'valid_to', 'max_uses', 'used_count', 'is_active']
    search_fields = ['code']
    list_filter = ['is_active', 'valid_from', 'valid_to']
    list_editable = ['is_active']
    list_per_page = 20
    readonly_fields = ['used_count', 'usage_percentage']

    def usage_percentage(self, obj):
        if obj.max_uses and obj.max_uses > 0:
            percentage = (obj.used_count / obj.max_uses) * 100
            return f"{percentage:.1f}%"
        return "Không giới hạn"
    usage_percentage.short_description = "Tỷ lệ sử dụng"

# Admin cho Notification
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'notification_type', 'title', 'is_read', 'created_at']
    search_fields = ['title', 'message', 'user__username']
    list_filter = ['notification_type', 'is_read', 'created_at']
    form = NotificationForm
    list_per_page = 20
    readonly_fields = ['message_preview']

    def message_preview(self, obj):
        return obj.message[:100] + ('...' if len(obj.message) > 100 else '')
    message_preview.short_description = "Xem trước tin nhắn"

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')

# Custom Admin Site
class HotelAdminSite(admin.AdminSite):
    site_header = 'Hệ Thống Quản Lý Khách Sạn'
    site_title = 'Quản Trị Khách Sạn'
    index_title = 'Chào Mừng Đến Với Trang Quản Trị Khách Sạn'

    def get_urls(self):
        return [
            path('hotel-stats/', self.hotel_stats, name='hotel-stats'),
            path('revenue-stats/', self.revenue_stats, name='revenue-stats'),
        ] + super().get_urls()

    def hotel_stats(self, request):
        # Thống kê tổng quan
        total_rooms = Room.objects.count()
        available_rooms = Room.objects.filter(status='available').count()
        occupied_rooms = Room.objects.filter(status='occupied').count()
        booked_rooms = Room.objects.filter(status='booked').count()
        
        # Thống kê đặt phòng
        today = timezone.now().date()
        bookings_today = Booking.objects.filter(created_at__date=today).count()
        total_bookings = Booking.objects.count()
        
        # Thống kê khách hàng
        total_customers = User.objects.filter(role='customer').count()
        new_customers_this_month = User.objects.filter(
            role='customer',
            created_at__month=today.month,
            created_at__year=today.year
        ).count()
        
        # Thống kê doanh thu
        total_revenue = Payment.objects.filter(status=True).aggregate(
            total=Sum('amount')
        )['total'] or 0
        
        # Thống kê theo loại phòng
        room_type_stats = RoomType.objects.annotate(
            room_count=Count('rooms'),
            booking_count=Count('rooms__bookings')
        ).values('name', 'room_count', 'booking_count')
        
        # Thống kê đặt phòng theo trạng thái
        booking_status_stats = Booking.objects.values('status').annotate(
            count=Count('id')
        ).order_by('status')

        return TemplateResponse(request, 'admin/hotel_stats.html', {
            'total_rooms': total_rooms,
            'available_rooms': available_rooms,
            'occupied_rooms': occupied_rooms,
            'booked_rooms': booked_rooms,
            'bookings_today': bookings_today,
            'total_bookings': total_bookings,
            'total_customers': total_customers,
            'new_customers_this_month': new_customers_this_month,
            'total_revenue': total_revenue,
            'room_type_stats': room_type_stats,
            'booking_status_stats': booking_status_stats,
        })

    def revenue_stats(self, request):
        # Thống kê doanh thu theo tháng
        current_year = timezone.now().year
        monthly_revenue = Payment.objects.filter(
            status=True,
            paid_at__year=current_year
        ).extra(
            select={'month': 'MONTH(paid_at)'}
        ).values('month').annotate(
            total=Sum('amount')
        ).order_by('month')
        
        # Thống kê doanh thu theo phương thức thanh toán
        payment_method_stats = Payment.objects.filter(status=True).values(
            'payment_method'
        ).annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('payment_method')
        
        # Top khách hàng
        top_customers = User.objects.filter(
            role='customer',
            rentals__payments__status=True
        ).annotate(
            total_spent=Sum('rentals__payments__amount')
        ).order_by('-total_spent')[:10]

        return TemplateResponse(request, 'admin/revenue_stats.html', {
            'monthly_revenue': monthly_revenue,
            'payment_method_stats': payment_method_stats,
            'top_customers': top_customers,
            'current_year': current_year,
        })

# Khởi tạo admin site
admin_site = HotelAdminSite(name='hotel_admin')

# Đăng ký các model
admin_site.register(User, UserAdmin)
admin_site.register(RoomType, RoomTypeAdmin)
admin_site.register(Room, RoomAdmin)
admin_site.register(Booking, BookingAdmin)
admin_site.register(RoomRental, RoomRentalAdmin)
admin_site.register(Payment, PaymentAdmin)
admin_site.register(DiscountCode, DiscountCodeAdmin)
admin_site.register(Notification, NotificationAdmin)

# Đăng ký với admin mặc định
admin.site.register(User, UserAdmin)
admin.site.register(RoomType, RoomTypeAdmin)
admin.site.register(Room, RoomAdmin)
admin.site.register(Booking, BookingAdmin)
admin.site.register(RoomRental, RoomRentalAdmin)
admin.site.register(Payment, PaymentAdmin)
admin.site.register(DiscountCode, DiscountCodeAdmin)
admin.site.register(Notification, NotificationAdmin)
