from django.db.models.signals import post_save, pre_save, post_migrate, m2m_changed
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.apps import apps
from django.utils import timezone
from .models import Booking, BookingStatus, Notification, RoomRental, Payment, Room

User = get_user_model()


# Django M2M signal actions
# action == "pre_add"     # Trước khi thêm relation
# action == "post_add"    # Sau khi thêm relation  
# action == "pre_remove"  # Trước khi xóa relation
# action == "post_remove" # Sau khi xóa relation
# action == "pre_clear"   # Trước khi clear toàn bộ
# action == "post_clear"  # Sau khi clear toàn bộ

@receiver(post_migrate)
def create_superuser(sender, **kwargs):
    """
    Signal tạo superuser tự động sau khi migrate nếu chưa có
    """
    if sender.name == 'hotelplatform':  # Chỉ chạy khi migrate app hotelplatform
        if not User.objects.filter(is_superuser=True).exists():
            try:
                User.objects.create_superuser(
                    username='admin',
                    email='admin@gmail.com',
                    password='123',
                    full_name='admin'
                )
                print("Đã tạo superuser tự động: admin/123")
            except Exception as e:
                print(f"Lỗi khi tạo superuser: {e}")


@receiver(pre_save, sender=Booking)
def booking_pre_save(sender, instance, **kwargs):
    """
    Signal xử lý trước khi booking được lưu
    """
    # Nếu booking được hủy, giải phóng phòng
    if instance.pk:
        try:
            old_instance = Booking.objects.get(pk=instance.pk)
            if old_instance.status != BookingStatus.CANCELLED and instance.status == BookingStatus.CANCELLED:
                # Giải phóng phòng
                for room in instance.rooms.all():
                    # Chỉ cập nhật nếu phòng không phải 'occupied'
                    if room.status != 'occupied':
                        room.status = 'available'
                        room.save()
                
                # Tạo thông báo hủy booking
                Notification.objects.create(
                    user=instance.customer,
                    notification_type='booking_confirmation',
                    title='Booking đã bị hủy',
                    message=f'Booking {instance.id} đã bị hủy.'
                )
        except Booking.DoesNotExist:
            pass


@receiver(post_save, sender=Booking)
def booking_post_save(sender, instance, created, **kwargs):
    """
    Signal xử lý sau khi booking được lưu
    """
    if created:
        # Tạo thông báo cho customer khi booking mới được tạo
        Notification.objects.create(
            user=instance.customer,
            notification_type='booking_confirmation',
            title='Đặt phòng thành công',
            message=f'Đặt phòng của bạn đã được tạo thành công. Mã booking: {instance.id}'
        )
        
        # CÂP NHẬT TOTAL BOOKINGS VÀ CUSTOMER TYPE CHO USER
        # Cập nhật tự động số lần booking và loại khách hàng khi tạo booking mới
        if instance.customer and instance.customer.role == 'customer':
            try:
                # Gọi method refresh_customer_stats để cập nhật toàn bộ thống kê customer
                instance.customer.refresh_customer_stats()
                print(f"✅ Updated customer stats for {instance.customer.full_name}: total_bookings={instance.customer.total_bookings}, customer_type={instance.customer.customer_type}")
            except Exception as e:
                print(f"❌ Error updating customer stats for booking {instance.id}: {e}")
    
    # Tạo thông báo khi booking được xác nhận
    if instance.status == BookingStatus.CONFIRMED:
        Notification.objects.create(
            user=instance.customer,
            notification_type='booking_confirmation',
            title='Booking đã được xác nhận',
            message=f'Booking của bạn đã được xác nhận. Vui lòng chuẩn bị để check-in.'
        )
    
    # XỬ LÝ ROOM STATUS KHI BOOKING STATUS THAY ĐỔI
    if not created and instance.pk:
        try:
            # Lấy trạng thái booking cũ từ pre_save signal
            old_status = getattr(instance, '_original_status', None)
            
            # Nếu không có original_status, skip việc cập nhật room status
            if old_status is None:
                return
                
            print(f"Booking {instance.id} status changed: {old_status} → {instance.status}")
            
            # LOGIC CHÍNH: Cập nhật room status khi booking status thay đổi
            if old_status != instance.status:
                for room in instance.rooms.all():
                    print(f"Processing room {room.room_number} for booking status change")
                    
                    if instance.status == BookingStatus.CHECKED_IN:
                        # CONFIRMED → CHECKED_IN: Phòng chuyển thành 'occupied'
                        if room.status != 'occupied':
                            room.status = 'occupied'
                            room.save()
                            print(f"Room {room.room_number} status changed to occupied (check-in)")
                    
                    elif instance.status == BookingStatus.CHECKED_OUT:
                        # CHECKED_IN → CHECKED_OUT: Phòng chuyển thành 'available'
                        if room.status == 'occupied':
                            room.status = 'available'
                            room.save()
                            print(f"Room {room.room_number} status changed to available (check-out)")
                    
                    elif instance.status == BookingStatus.CANCELLED:
                        # ANY → CANCELLED: Phòng chuyển thành 'available' (nếu không occupied)
                        if room.status == 'booked':
                            room.status = 'available'
                            room.save()
                            print(f"Room {room.room_number} status changed to available (cancelled)")
                            
        except Exception as e:
            print(f"Error in booking status change processing: {e}")


@receiver(pre_save, sender=Booking)
def booking_pre_save_status_tracking(sender, instance, **kwargs):
    """
    Signal để track status change trước khi save
    """
    if instance.pk:
        try:
            old_instance = Booking.objects.get(pk=instance.pk)
            # Lưu trạng thái cũ vào custom attribute để sử dụng trong post_save
            instance._original_status = old_instance.status
        except Booking.DoesNotExist:
            instance._original_status = None


@receiver(m2m_changed, sender=Booking.rooms.through)
def booking_rooms_changed(sender, instance, action, **kwargs):
    """
    SIGNAL XỬ LÝ KHI ROOMS CỦA BOOKING THAY ĐỔI (THÊM/XÓA PHÒNG)
    Signal này được trigger khi rooms của booking thay đổi (thêm/xóa phòng)
    Chỉ xử lý việc cập nhật room status dựa trên booking status hiện tại
    """
    print(f"Signal booking_rooms_changed: action={action}, booking={instance.id}, status={instance.status}")
    
    if action == "post_add":
        try:
            # CẬP NHẬT ROOM STATUS dựa trên trạng thái booking hiện tại
            for room in instance.rooms.all():
                print(f"Processing room {room.room_number}, current status: {room.status}")
                
                if instance.status == BookingStatus.CHECKED_IN:
                    # Booking đã check-in → phòng chuyển thành 'occupied'
                    if room.status != 'occupied':
                        room.status = 'occupied'
                        room.save()
                        print(f"Room {room.room_number} status changed to occupied")
                    
                elif instance.status in [BookingStatus.PENDING, BookingStatus.CONFIRMED]:
                    # Booking pending/confirmed → phòng chuyển thành 'booked'
                    if room.status == 'available':
                        room.status = 'booked'
                        room.save()
                        print(f"Room {room.room_number} status changed to booked")
                        
                elif instance.status in [BookingStatus.CHECKED_OUT, BookingStatus.CANCELLED, BookingStatus.NO_SHOW]:
                    # Booking kết thúc → phòng chuyển thành 'available'
                    if room.status in ['booked', 'occupied']:
                        room.status = 'available'
                        room.save()
                        print(f"Room {room.room_number} status changed to available")

        except Exception as e:
            print(f"Error in booking_rooms_changed signal: {e}")
            raise e
    
    elif action == "post_remove":
        # Khi xóa phòng khỏi booking, chuyển phòng về available (nếu cần)
        removed_rooms = kwargs.get('pk_set', [])
        for room_id in removed_rooms:
            try:
                room = Room.objects.get(pk=room_id)
                if room.status in ['booked', 'occupied']:
                    room.status = 'available'
                    room.save()
                    print(f"Room {room.room_number} status changed to available (removed from booking)")
            except Room.DoesNotExist:
                pass


@receiver(post_save, sender=RoomRental)
def room_rental_post_save(sender, instance, created, **kwargs):
    """
    Signal xử lý sau khi RoomRental được lưu
    """
    # Tự động tạo Payment khi RoomRental được check-out (có actual_check_out_date)
    if not created and instance.actual_check_out_date:
        # Kiểm tra xem đã có Payment chưa
        existing_payment = Payment.objects.filter(rental=instance).first()
        if not existing_payment:
            # Tạo Payment record
            try:
                payment = Payment.objects.create(
                    customer=instance.customer,
                    rental=instance,
                    amount=instance.total_price,
                    status=False,  # Chưa thanh toán, cần thanh toán tại quầy
                    payment_method='cash',  # Mặc định thanh toán tiền mặt
                    transaction_id=f"PAY_{instance.id}_{timezone.now().strftime('%Y%m%d_%H%M%S')}"
                )
                print(f"✅ Auto-created Payment {payment.id} for RoomRental {instance.id}: {payment.amount} VND")
                
                # Tạo thông báo cho khách hàng
                Notification.objects.create(
                    user=instance.customer,
                    notification_type='booking_confirmation',
                    title='Hóa đơn đã được tạo',
                    message=f'Hóa đơn thanh toán {payment.transaction_id} đã được tạo. Số tiền: {payment.amount:,.0f} VND. Vui lòng thanh toán tại quầy.'
                )
                
            except Exception as e:
                print(f"❌ Error creating Payment for RoomRental {instance.id}: {e}")
    
    # RoomRental không ảnh hưởng total_bookings count nên không cần refresh stats


@receiver(post_save, sender=Payment)  
def payment_post_save(sender, instance, created, **kwargs):
    """
    Signal xử lý sau khi Payment được lưu
    """
    # Chỉ refresh customer stats khi payment status = True (đã thanh toán)
    # vì chỉ khi đó mới ảnh hưởng total_spent
    if instance.customer and instance.customer.role == 'customer' and instance.status:
        instance.customer.refresh_customer_stats()
        
    # Tạo thông báo khi thanh toán thành công
    if created and instance.status:
        Notification.objects.create(
            user=instance.customer,
            notification_type='booking_confirmation',
            title='Thanh toán thành công',
            message=f'Thanh toán {instance.transaction_id} đã được xử lý thành công. Số tiền: {instance.amount:,.0f} VND'
        )