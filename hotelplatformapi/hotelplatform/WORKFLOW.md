# Hotel Platform - Workflow Hoàn Chỉnh

## Tổng quan hệ thống

Hệ thống quản lý khách sạn với workflow hoàn chỉnh từ đặt phòng đến checkout, tích hợp QR code và phân quyền chi tiết.

## Workflow chính

### 1. Đặt phòng (Booking Creation)
1. Customer tạo booking mới
2. Hệ thống tự động tạo UUID cho booking
3. Booking ở trạng thái `PENDING`
4. Notification được tạo cho customer

### 2. Xác nhận booking (Booking Confirmation)
1. Staff/Owner xác nhận booking
2. Booking chuyển sang trạng thái `CONFIRMED`
3. QR code tự động được tạo (qua signals)
4. Notification xác nhận được gửi cho customer

### 3. Check-in (QR Code Scan)
1. Customer đến khách sạn với QR code
2. Staff scan QR code → lấy UUID
3. Hệ thống tìm booking theo UUID
4. Validate booking (confirmed, chưa check-in, đúng thời gian)
5. Tạo RoomRental với thông tin thực tế:
   - `check_in_date`: thời gian hiện tại
   - `check_out_date`: từ booking (sẽ update khi checkout)
   - `guest_count`: thực tế (có thể khác booking)
   - `total_price`: tạm tính
6. Cập nhật booking status → `CHECKED_IN`
7. Cập nhật room status → `occupied`

### 4. Check-out
1. Staff thực hiện check-out
2. Cập nhật `check_out_date` thực tế
3. Tính toán lại `total_price` dựa trên:
   - Thời gian lưu trú thực tế
   - Số khách thực tế
   - Phụ thu (nếu có)
4. Cập nhật booking status → `CHECKED_OUT`
5. Giải phóng phòng → `available`
6. Tạo Payment record

### 5. Thanh toán
1. Tạo Payment dựa trên RoomRental
2. Áp dụng discount code (nếu có)
3. Xử lý thanh toán (VNPay/Cash/Stripe)
4. Cập nhật payment status

## Cấu trúc API

### Authentication & Users
- `POST /api/users/` - Đăng ký customer (auto role=customer)
- `GET /api/users/profile/` - Thông tin user hiện tại
- `PUT /api/users/update-profile/` - Cập nhật profile
- `POST /api/users/create-staff/` - Owner tạo staff account
- `GET /api/users/staff-list/` - Owner xem danh sách staff

### Room Management (Owner/Staff)
- `GET /api/room-types/` - Danh sách loại phòng
- `POST /api/room-types/` - Tạo loại phòng (Owner)
- `GET /api/rooms/` - Danh sách phòng
- `POST /api/rooms/` - Tạo phòng (Owner)
- `GET /api/rooms/available/` - Phòng trống
- `PUT /api/rooms/{id}/` - Cập nhật phòng (Owner/Staff)

### Booking Management
- `POST /api/bookings/` - Tạo booking (Customer)
- `GET /api/bookings/` - Danh sách booking (phân quyền theo role)
- `GET /api/bookings/{id}/` - Chi tiết booking
- `POST /api/bookings/{id}/confirm/` - Xác nhận booking (Owner/Staff)
- `POST /api/bookings/{id}/cancel/` - Hủy booking

### Check-in/Check-out (Owner/Staff)
- `POST /api/qr-scan/` - Scan QR và check-in
- `POST /api/qr-generate/` - Tạo QR code
- `GET /api/rentals/` - Danh sách rental
- `POST /api/rentals/{id}/checkout/` - Check-out

### Payment (Owner/Staff)
- `GET /api/payments/` - Danh sách payment
- `POST /api/payments/` - Tạo payment
- `POST /api/payments/{id}/process/` - Xử lý payment
- `POST /vnpay/create-payment/` - Tạo link VNPay

### Analytics (Owner only)
- `GET /api/stats/` - Thống kê tổng quan
- `GET /api/stats/revenue/` - Báo cáo doanh thu
- `GET /api/stats/bookings/` - Thống kê booking

### Notifications
- `GET /api/notifications/` - Thông báo của user
- `POST /api/notifications/{id}/mark-as-read/` - Đánh dấu đã đọc
- `POST /api/notifications/create/` - Tạo thông báo (Owner)

### Discount Codes (Owner only)
- `GET /api/discount-codes/` - Danh sách mã giảm giá
- `POST /api/discount-codes/` - Tạo mã giảm giá
- `POST /api/discount-codes/validate/` - Kiểm tra mã hợp lệ
- `GET /api/notifications/` - Thông báo của user
- `POST /api/notifications/{id}/mark-as-read/` - Đánh dấu đã đọc

## Models quan trọng

### Booking
```python
class Booking(models.Model):
    customer = ForeignKey(User)
    rooms = ManyToManyField(Room)
    check_in_date = DateTimeField()
    check_out_date = DateTimeField()
    total_price = DecimalField()
    guest_count = PositiveIntegerField()
    status = CharField(choices=BookingStatus.choices)
    qr_code = CloudinaryField()
    uuid = UUIDField(default=uuid.uuid4)  # Cho QR code
    
    def generate_qr_code(self):
        # Tạo QR code chứa UUID và thông tin booking
    
    def check_in(self, actual_guest_count):
        # Tạo RoomRental và cập nhật status
```

### RoomRental
```python
class RoomRental(models.Model):
    booking = ForeignKey(Booking)
    customer = ForeignKey(User)
    rooms = ManyToManyField(Room)
    check_in_date = DateTimeField(auto_now_add=True)  # Thời gian thực tế
    check_out_date = DateTimeField()  # Sẽ update khi checkout
    total_price = DecimalField()  # Giá thực tế
    guest_count = PositiveIntegerField()  # Số khách thực tế
    
    def check_out(self, actual_check_out_date):
        # Tính toán giá cuối cùng và giải phóng phòng
    
    def calculate_final_price(self):
        # Tính giá dựa trên thời gian và số khách thực tế
```

## Phân quyền và Giao diện

### Admin (Nhà sản xuất ứng dụng)
- **Vai trò**: Nhà phát triển/quản trị hệ thống toàn cầu
- **Giao diện**: **CHỈ sử dụng Django Admin** (`/admin/`)
- **Đặc điểm**:
  - Là superuser của toàn hệ thống
  - Không có giao diện riêng biệt
  - Chỉ truy cập qua Django Admin interface
- **Quyền hạn**:
  - CRUD tất cả các thành phần trong hệ thống
  - Quản lý toàn bộ database
  - **Tạo và quản lý Owner accounts** (vai trò chính)
  - Cấu hình hệ thống và settings
  - Xem thống kê toàn hệ thống
  - Backup/restore dữ liệu
  - Quản lý permissions và roles

### Owner (Chủ khách sạn)
- **Vai trò**: Chủ sở hữu khách sạn cụ thể
- **Được tạo bởi**: **Admin (qua Django Admin)**
- **Giao diện**: **Custom Owner Dashboard** (web/mobile)
- **Đặc điểm**:
  - Có giao diện quản lý riêng, không dùng Django Admin
  - Focus vào quản lý business operations
- **Quyền hạn**:
  - Quản lý thông tin khách sạn (rooms, room types, facilities)
  - **Tạo và quản lý Staff accounts** (via API)
  - Xem thống kê doanh thu và analytics chi tiết
  - Tạo và quản lý discount codes
  - Quản lý pricing strategies và policies
  - Xem báo cáo tài chính
  - Quản lý inventory và resources

### Staff (Nhân viên)
- **Vai trò**: Nhân viên lễ tân/vận hành hàng ngày
- **Được tạo bởi**: **Owner (qua API)**
- **Giao diện**: **Custom Staff Interface** (web/mobile)
- **Đặc điểm**:
  - Giao diện tối ưu cho operations hàng ngày
  - Focus vào customer service và room management
- **Quyền hạn**:
  - **Check-in/check-out khách hàng** (core function)
  - **Scan QR code** và xử lý arrival
  - Xác nhận booking thông thường
  - Quản lý room status và availability
  - Xử lý payment và transactions
  - Xem danh sách bookings/rentals
  - Cập nhật thông tin khách hàng

### Customer (Khách hàng)
- **Vai trò**: Người đặt phòng và sử dụng dịch vụ
- **Được tạo**: **Tự đăng ký** (auto role=customer)
- **Giao diện**: **Customer Mobile/Web App**
- **Đặc điểm**:
  - Giao diện user-friendly cho booking experience
  - Self-service và mobile-first approach
- **Quyền hạn**:
  - Tạo booking mới
  - Xem và quản lý **chỉ booking của mình**
  - Hủy booking (trong thời hạn cho phép)
  - Cập nhật thông tin cá nhân
  - Xem lịch sử đặt phòng
  - Nhận notifications
  - **Sử dụng QR code để check-in**
  <!-- - Đánh giá và feedback dịch vụ -->

## Hệ thống giao diện

### 1. Django Admin Interface (CHỈ dành cho Admin)
- **URL**: `/admin/`
- **Mục đích**: Quản lý toàn hệ thống, cấu hình, tạo Owner
- **Tính năng**:
  - Full CRUD operations trên tất cả models
  - User role management
  - System configuration và settings
  - Database administration
  - Tạo Owner accounts
  - System monitoring và logs
- **Lưu ý**: Owner, Staff, Customer **KHÔNG** được truy cập Django Admin

### 2. Owner Dashboard (Custom Interface)
- **URL**: `/owner/dashboard/`
- **Mục đích**: Quản lý khách sạn và business operations
- **Tính năng**:
  - Hotel management interface
  - Staff management (tạo, xóa, cập nhật staff)
  - Revenue analytics và reports
  - Booking oversight và approval
  - Room và service management
  - Discount code management
  - Business insights và performance metrics
- **Responsive**: Web + Mobile optimized

### 3. Staff Interface (Custom Interface)
- **URL**: `/staff/dashboard/`
- **Mục đích**: Vận hành hàng ngày và customer service
- **Tính năng**:
  - Daily operations dashboard
  - **QR code scanner** (core feature)
  - Check-in/check-out management
  - Booking management và confirmation
  - Room status updates
  - Payment processing
  - Customer service tools
- **Responsive**: Web + Mobile optimized (focus mobile)

### 4. Customer App (Custom Interface)
- **URL**: `/customer/app/`
- **Mục đích**: Booking và self-service
- **Tính năng**:
  - Hotel search và room booking
  - Booking management và history
  - Profile management
  - **QR code display** cho check-in
  - Notifications và updates
  - Review và rating system
  - Payment và booking status
- **Responsive**: Mobile-first design

## Cách phân chia giao diện

### 1. Routing và Access Control
```python
# urls.py
urlpatterns = [
    path('admin/', admin.site.urls),  # CHỈ Admin
    path('owner/', include('owner.urls')),  # CHỈ Owner
    path('staff/', include('staff.urls')),  # CHỈ Staff  
    path('customer/', include('customer.urls')),  # CHỈ Customer
    path('api/', include('api.urls')),  # API cho tất cả
]
```

### 2. Frontend Technology
- **Admin**: Django Admin (built-in)
- **Owner**: React/Vue.js dashboard
- **Staff**: React/Vue.js với mobile-first
- **Customer**: React Native/Flutter app hoặc PWA

### 3. Authentication Flow
```python
# Middleware kiểm tra role và redirect
def role_based_redirect(user):
    if user.role == 'admin':
        return redirect('/admin/')
    elif user.role == 'owner':
        return redirect('/owner/dashboard/')
    elif user.role == 'staff':
        return redirect('/staff/dashboard/')
    elif user.role == 'customer':
        return redirect('/customer/app/')
```

## Workflow tạo User và phân quyền

### 1. Admin tạo Owner (Qua Django Admin)
```python
# Chỉ Admin có thể tạo Owner qua Django Admin (/admin/)
# Truy cập Admin Panel → Users → Add User
owner = User.objects.create_user(
    username='owner_hotel_abc',
    email='owner@hotel.com',
    password='secure_password',
    role='owner',  # Quan trọng: set role=owner
    full_name='Nguyễn Văn Owner',
    phone='0123456789'
)
```

### 2. Owner tạo Staff (Qua API)
```python
# API: POST /api/users/create-staff/
# Owner login vào dashboard và sử dụng staff management
{
    "username": "staff_reception",
    "email": "staff@hotel.com",
    "password": "staff_password",
    "full_name": "Nguyễn Văn Staff",
    "phone": "0123456789"
}
# System tự động set role='staff' và liên kết với Owner
```

### 3. Customer tự đăng ký (Qua Customer App)
```python
# API: POST /api/users/register/
# Customer tự đăng ký qua mobile app hoặc website
{
    "username": "customer123",
    "email": "customer@email.com", 
    "password": "customer_password",
    "full_name": "Nguyễn Văn Customer",
    "phone": "0987654321"
}
# System tự động set role='customer'
```

### 4. Access Control Flow
```python
# Middleware kiểm tra role khi truy cập
@login_required
def check_user_access(request):
    user = request.user
    
    if user.role == 'admin':
        # Cho phép truy cập Django Admin
        return redirect('/admin/')
    elif user.role == 'owner':
        # Redirect đến Owner Dashboard
        return redirect('/owner/dashboard/')
    elif user.role == 'staff':
        # Redirect đến Staff Interface
        return redirect('/staff/dashboard/')
    elif user.role == 'customer':
        # Redirect đến Customer App
        return redirect('/customer/app/')
    else:
        # Unauthorized
        return redirect('/login/')
```

## Signals & Automation

### Booking Signals
```python
@receiver(post_save, sender=Booking)
def booking_post_save(sender, instance, created, **kwargs):
    if created:
        # Tạo notification cho customer
    
    if instance.status == BookingStatus.CONFIRMED and not instance.qr_code:
        # Tự động tạo QR code
        # Tạo notification xác nhận
```

## QR Code Workflow

### Tạo QR Code
```json
{
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "booking_id": 1,
    "customer_name": "Nguyễn Văn A",
    "check_in_date": "2024-12-01T14:00:00Z",
    "rooms": ["101", "102"]
}
```

### Scan QR Code
```python
# Request
{
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "actual_guest_count": 3
}

# Response
{
    "message": "Check-in thành công",
    "rental": {...},
    "booking": {...}
}
```

## Tính toán giá

### Giá cơ bản
```
Giá phòng = base_price * số_ngày
```

### Phụ thu khách thêm
```
Nếu guest_count > max_guests:
    extra_guests = guest_count - max_guests
    surcharge = base_price * extra_guest_surcharge% * extra_guests * số_ngày
    total = base_price * số_ngày + surcharge
```

### Discount Code
```
final_amount = total_price * (1 - discount_percentage/100)
```

## Error Handling

### Validation Rules
1. Check-in date < Check-out date
2. Check-in trong vòng 28 ngày
3. Phòng phải available khi booking
4. Số khách tối đa 3 người/phòng
5. Booking phải confirmed mới check-in được

### Common Errors
- `400`: Dữ liệu không hợp lệ
- `401`: Chưa đăng nhập
- `403`: Không có quyền
- `404`: Không tìm thấy resource
- `409`: Conflict (phòng đã được đặt)

## Monitoring & Logs

### Metrics
- Số booking mới/ngày
- Tỷ lệ check-in thành công
- Doanh thu theo tháng
- Tỷ lệ hủy booking

### Logs
- QR code scan attempts
- Payment transactions
- User activities
- System errors

## Deployment Notes

### Required Packages
- Django + DRF
- Cloudinary (lưu QR code, avatar)
- qrcode + Pillow (tạo QR code)  
- pytz (timezone)

### Environment Variables
- Database credentials
- Cloudinary settings
- VNPay credentials
- Secret keys

### Initial Setup
1. **Tạo superuser (Admin)**
```bash
python manage.py createsuperuser
# Role sẽ tự động là 'admin'
```

2. **Admin tạo Owner qua Django Admin**
- Truy cập `/admin/`
- Tạo User mới với role='owner'
- Owner sẽ có quyền quản lý khách sạn

3. **Owner tạo Staff qua API**
- Owner login vào dashboard
- Sử dụng API tạo staff accounts

4. **Customer tự đăng ký**
- Qua mobile app hoặc website
- Auto role='customer'

### Giao diện Development

#### 1. Django Admin (Admin only)
- URL: `/admin/`
- Full system management
- Create Owner accounts

#### 2. Owner Dashboard  
- URL: `/owner/dashboard/`
- Hotel management
- Staff management
- Analytics

#### 3. Staff Interface
- URL: `/staff/dashboard/`
- Daily operations
- Check-in/check-out
- QR scanner

#### 4. Customer App
- URL: `/customer/app/`  
- Booking management
- Profile management

### Database Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

## Tóm tắt Workflow

Hệ thống Hotel Platform được thiết kế với 4 role rõ ràng:

1. **Admin**: Nhà phát triển, sử dụng Django Admin để quản lý toàn hệ thống
2. **Owner**: Chủ khách sạn, có dashboard riêng để quản lý operations  
3. **Staff**: Nhân viên, có interface cho các tác vụ hàng ngày
4. **Customer**: Khách hàng, có app để đặt phòng và quản lý booking

**Workflow chính:**
- Customer đăng ký (auto role=customer) → Tạo booking
- Owner/Staff xác nhận booking → Tự động tạo QR code  
- Staff scan QR code → Check-in tạo RoomRental
- Staff thực hiện check-out → Tính giá thực tế và payment

**Giao diện:**
- Django Admin cho Admin
- 3 custom interfaces cho Owner, Staff, Customer

Hệ thống này cung cấp workflow hoàn chỉnh cho quản lý khách sạn với QR code, phân quyền chi tiết và xử lý thanh toán tự động.
