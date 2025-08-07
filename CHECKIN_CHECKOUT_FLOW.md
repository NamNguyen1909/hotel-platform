# 🏨 CHECK-IN / CHECK-OUT FLOW DOCUMENTATION

## 📋 Tổng quan quy trình

### **Check-in Process (Quy trình nhận phòng)**
1. **Booking Status**: `CONFIRMED` → `CHECKED_IN`  
2. **RoomRental Creation**: Tạo record với thời gian check-in thực tế
3. **Room Status**: `booked` → `occupied`
4. **Guest Count**: Cập nhật số khách thực tế, tính phụ thu nếu có

### **Check-out Process (Quy trình trả phòng)**
1. **Booking Status**: `CHECKED_IN` → `CHECKED_OUT`
2. **RoomRental Update**: Cập nhật `actual_check_out_date`
3. **Room Status**: `occupied` → `available` 
4. **Payment Creation**: Tự động tạo hóa đơn thanh toán

## 🔄 API Endpoints

### **1. Check-in Booking**
```http
POST /bookings/{id}/checkin/
Content-Type: application/json

{
    "actual_guest_count": 4
}
```

**Response Success:**
```json
{
    "message": "Check-in đặt trước thành công",
    "booking_id": 123,
    "rental_id": 456,
    "actual_guest_count": 4,
    "calculated_price": "2500000.00",
    "original_price": "2000000.00"
}
```

### **2. Check-out Booking**
```http
POST /bookings/{id}/checkout/
```

**Response Success:**
```json
{
    "message": "Check-out thành công",
    "booking_id": 123,
    "rental_id": 456,
    "check_out_time": "2025-08-07T15:30:00+00:00",
    "final_price": "2500000.00",
    "payment": {
        "id": 789,
        "transaction_id": "PAY_456_20250807_1530",
        "amount": "2500000.00",
        "status": false,
        "payment_method": "cash"
    },
    "booking": { ... }
}
```

## 🏗️ Database Schema Changes

### **Thời gian được ghi lại:**

#### **Booking Model:**
- `check_in_date`: Thời gian dự kiến check-in (từ booking form)
- `check_out_date`: Thời gian dự kiến check-out (từ booking form)

#### **RoomRental Model:**
- `check_in_date`: ✅ **Thời gian thực tế check-in** (ghi khi checkin)
- `check_out_date`: Thời gian dự kiến check-out (copy từ Booking)
- `actual_check_out_date`: ✅ **Thời gian thực tế check-out** (ghi khi checkout)

## 🔧 Technical Implementation

### **Check-in Logic (BookingViewSet.checkin)**

```python
@action(detail=True, methods=['post'])
def checkin(self, request, pk=None):
    # 1. Validate booking status = CONFIRMED
    # 2. Validate actual_guest_count
    # 3. Capacity validation (150% room limit)
    # 4. Update booking status to CHECKED_IN
    # 5. Create RoomRental with actual check-in time
    # 6. Calculate actual price with surcharge
    # 7. Room status updated via signals
```

**Key Features:**
- ✅ **Real-time Check-in**: `RoomRental.check_in_date = timezone.now()`
- ✅ **Guest Count Validation**: 150% capacity limit
- ✅ **Price Calculation**: Tự động tính phụ thu
- ✅ **Room Status**: Auto update via signals

### **Check-out Logic (BookingViewSet.checkout)**

```python
@action(detail=True, methods=['post'])
def checkout(self, request, pk=None):
    # 1. Validate booking status = CHECKED_IN
    # 2. Find associated RoomRental
    # 3. Update booking status to CHECKED_OUT
    # 4. Set actual_check_out_date = timezone.now()
    # 5. Payment auto-created via signals
    # 6. Room status updated via signals
```

**Key Features:**
- ✅ **Real-time Check-out**: `RoomRental.actual_check_out_date = timezone.now()`
- ✅ **Auto Payment**: Tạo hóa đơn tự động
- ✅ **Room Liberation**: Giải phóng phòng tự động
- ✅ **Comprehensive Logging**: Chi tiết log process

## 🔌 Signals Automation

### **1. Booking Status Changes (signals.py)**

```python
@receiver(post_save, sender=Booking)
def booking_post_save(sender, instance, created, **kwargs):
    # Cập nhật Room status khi Booking status thay đổi:
    # CONFIRMED → CHECKED_IN: room.status = 'occupied'
    # CHECKED_IN → CHECKED_OUT: room.status = 'available'
    # ANY → CANCELLED: room.status = 'available'
```

### **2. Payment Auto-Creation (signals.py)**

```python
@receiver(post_save, sender=RoomRental)
def room_rental_post_save(sender, instance, created, **kwargs):
    # Tự động tạo Payment khi có actual_check_out_date
    if not created and instance.actual_check_out_date:
        Payment.objects.create(
            customer=instance.customer,
            rental=instance,
            amount=instance.total_price,
            status=False,  # Chưa thanh toán
            payment_method='cash',
            transaction_id=f"PAY_{instance.id}_{timestamp}"
        )
```

## 📊 Data Flow Diagram

```
CHECK-IN FLOW:
┌─────────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│   PENDING   │ → │  CONFIRMED   │ → │ CHECKED_IN  │ → │ CHECKED_OUT  │
└─────────────┘    └──────────────┘    └─────────────┘    └──────────────┘
                           │                    │                    │
                           ▼                    ▼                    ▼
                   ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
                   │ Room: booked │ → │Room: occupied│ → │Room: available│
                   └──────────────┘    └─────────────┘    └──────────────┘
                                              │                    │
                                              ▼                    ▼
                                   ┌─────────────────┐    ┌──────────────┐
                                   │ RoomRental      │ → │   Payment    │
                                   │ check_in_date   │    │ Auto-created │
                                   └─────────────────┘    └──────────────┘
```

## ✅ Validation Rules

### **Check-in Validations:**
1. ✅ Booking status = `CONFIRMED`
2. ✅ `actual_guest_count > 0`
3. ✅ `actual_guest_count ≤ 150% room capacity`
4. ✅ All rooms in `['booked', 'available']` status
5. ✅ Not already checked-in

### **Check-out Validations:**
1. ✅ Booking status = `CHECKED_IN`
2. ✅ RoomRental exists
3. ✅ Not already checked-out (`actual_check_out_date` is None)
4. ✅ User has permission (`CanCheckOut`)

## 🔒 Security & Permissions

### **Required Permissions:**
- **Check-in**: `CanConfirmBooking` (Staff/Admin/Owner)
- **Check-out**: `CanCheckOut` (Staff/Admin/Owner)

### **Role Access:**
- **Customer**: Không thể check-in/out trực tiếp
- **Staff**: Có thể check-in/out
- **Admin/Owner**: Full access

## 🚨 Error Handling

### **Common Error Scenarios:**

```json
// Booking chưa confirmed
{
    "error": "Booking chưa được xác nhận hoặc đã check-in"
}

// Vượt quá sức chứa
{
    "error": "Không thể check-in! Số khách thực tế (8) vượt quá giới hạn 150% sức chứa phòng (tối đa: 6 khách cho 4 sức chứa cơ bản).",
    "details": {
        "actual_guests": 8,
        "room_capacity": 4,
        "max_allowed": 6,
        "exceeded_by": 2
    }
}

// Đã check-out
{
    "error": "Đã check-out trước đó"
}
```

## 📈 Metrics & Logging

### **Comprehensive Logging:**
```python
logger.info(f"=== Starting check-in process for booking {pk} ===")
logger.info(f"Capacity validation: {actual_guest_count} ≤ {max_allowed_guests}")
logger.info(f"✓ Capacity validation passed")
logger.info(f"Check-in thành công cho Booking {booking.id}")
```

### **Performance Metrics:**
- Database transactions are atomic
- M2M relationships handled efficiently
- Signals trigger automatically for consistency

## 🎯 Future Enhancements

1. **Early Check-in/Late Check-out**: Phụ thu cho checkin sớm/checkout muộn
2. **Mobile Check-in**: QR code scanning
3. **Partial Room Check-out**: Check-out từng phòng riêng biệt
4. **Real-time Notifications**: WebSocket cho staff
5. **Integration**: PMS systems, key card systems

---

**✅ Hệ thống Check-in/Check-out đã hoàn thiện với đầy đủ validations, signals automation và error handling!**
