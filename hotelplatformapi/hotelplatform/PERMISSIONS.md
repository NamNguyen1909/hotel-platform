# Hệ thống phân quyền Hotel Platform

Hệ thống phân quyền được thiết kế dựa trên 4 vai trò chính trong quản lý khách sạn:

## Các vai trò (Roles)

### 1. Admin (Quản trị viên)
- Quyền cao nhất trong hệ thống
- Có thể quản lý tất cả tài nguyên
- Có thể xem thống kê toàn hệ thống

### 2. Owner (Chủ khách sạn)
- Quyền quản lý hoạt động khách sạn
- Không thể quản lý user khác
- Có thể xem thống kê

### 3. Staff (Nhân viên)
- Quyền thực hiện các tác vụ hàng ngày
- Check-in/check-out khách
- Xác nhận booking

### 4. Customer (Khách hàng)
- Chỉ có thể quản lý booking của mình
- Xem thông tin cá nhân

## Ma trận phân quyền

| Tính năng | Admin | Owner | Staff | Customer |
|-----------|-------|-------|-------|----------|
| Quản lý User | ✅ | ❌ | ❌ | ❌ |
| Quản lý RoomType | ✅ | ✅ | ❌ | ❌ |
| Quản lý Room | ✅ | ✅ | ✅ | ❌ |
| Tạo Booking | ✅ | ✅ | ✅ | ✅ |
| Xem tất cả Booking | ✅ | ✅ | ✅ | ❌ |
| Xem Booking riêng | ✅ | ✅ | ✅ | ✅ |
| Xác nhận Booking | ✅ | ✅ | ✅ | ❌ |
| Hủy Booking | ✅ | ✅ | ✅ | ✅* |
| Check-in | ✅ | ✅ | ✅ | ❌ |
| Check-out | ✅ | ✅ | ✅ | ❌ |
| Quản lý Payment | ✅ | ✅ | ✅ | ❌ |
| Xem Payment riêng | ✅ | ✅ | ✅ | ✅ |
| Tạo Discount Code | ✅ | ✅ | ❌ | ❌ |
| Tạo QR Code | ✅ | ✅ | ✅ | ❌ |
| Scan QR Code | ✅ | ✅ | ✅ | ❌ |
| Xem thống kê | ✅ | ✅ | ❌ | ❌ |
| Tạo thông báo | ✅ | ✅ | ❌ | ❌ |
| Xem thông báo riêng | ✅ | ✅ | ✅ | ✅ |

*Customer chỉ có thể hủy booking của mình

## Các Permission Classes

### Permission cơ bản theo role
- `IsAdminUser`: Chỉ admin
- `IsOwnerUser`: Chỉ owner
- `IsStaffUser`: Chỉ staff
- `IsCustomerUser`: Chỉ customer

### Permission kết hợp
- `IsAdminOrOwner`: Admin hoặc Owner
- `IsAdminOrOwnerOrStaff`: Admin, Owner hoặc Staff

### Permission theo chức năng
- `CanManageRooms`: Quản lý phòng
- `CanManageBookings`: Quản lý booking
- `CanManagePayments`: Quản lý thanh toán
- `CanCheckIn`: Thực hiện check-in
- `CanCheckOut`: Thực hiện check-out
- `CanGenerateQRCode`: Tạo QR code
- `CanViewStats`: Xem thống kê
- `CanCreateDiscountCode`: Tạo mã giảm giá

### Permission theo ownership
- `IsBookingOwner`: Chỉ owner của booking hoặc staff
- `IsRoomRentalOwner`: Chỉ owner của rental hoặc staff
- `IsPaymentOwner`: Chỉ owner của payment hoặc staff
- `IsNotificationOwner`: Chỉ owner của notification

## Workflow phân quyền

### 1. Đặt phòng (Booking)
- **Tạo**: Tất cả user đã xác thực
- **Xem**: Owner hoặc staff xem tất cả, customer chỉ xem của mình
- **Cập nhật**: Owner của booking hoặc staff
- **Xác nhận**: Chỉ staff trở lên
- **Hủy**: Owner của booking hoặc staff

### 2. Check-in/Check-out
- **Check-in**: Chỉ staff trở lên, thông qua scan QR code
- **Check-out**: Chỉ staff trở lên, tính toán lại giá

### 3. Thanh toán
- **Tạo**: Chỉ staff trở lên
- **Xử lý**: Chỉ staff trở lên
- **Xem**: Owner hoặc staff xem tất cả, customer chỉ xem của mình

### 4. QR Code
- **Tạo**: Chỉ staff trở lên
- **Scan**: Chỉ staff trở lên

### 5. Thống kê
- **Xem**: Chỉ admin và owner

## Cách sử dụng

### Trong ViewSet
```python
class BookingViewSet(viewsets.ViewSet):
    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated()]
        elif self.action in ['update', 'partial_update']:
            return [IsBookingOwner()]
        elif self.action == 'confirm':
            return [CanConfirmBooking()]
        return [IsAuthenticated()]
```

### Trong APIView
```python
class QRCodeScanView(APIView):
    permission_classes = [CanCheckIn]
```

### Kiểm tra permission trong code
```python
from .permissions import has_permission

if has_permission(request.user, 'can_view_stats'):
    # Logic xem thống kê
    pass
```

## Bảo mật

1. **Authentication**: Tất cả API đều yêu cầu xác thực
2. **Authorization**: Phân quyền chi tiết theo role và ownership
3. **Object-level permission**: Kiểm tra quyền trên từng object cụ thể
4. **Validation**: Validate dữ liệu đầu vào và quyền truy cập

## Lưu ý

- Permission được kiểm tra ở cả level view và object
- Customer chỉ có thể truy cập tài nguyên của mình
- Staff có quyền thực hiện các tác vụ hàng ngày
- Owner có quyền quản lý toàn bộ khách sạn
- Admin có quyền cao nhất trong hệ thống
