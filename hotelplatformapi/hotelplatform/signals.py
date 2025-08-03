from django.db.models.signals import post_save, pre_save, post_migrate, m2m_changed
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.apps import apps
from .models import Booking, BookingStatus, Notification, RoomRental, Payment

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
                print("✅ Đã tạo superuser tự động: admin/123")
            except Exception as e:
                print(f"❌ Lỗi khi tạo superuser: {e}")


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
    
    # Tạo thông báo khi booking được xác nhận
    if instance.status == BookingStatus.CONFIRMED:
        Notification.objects.create(
            user=instance.customer,
            notification_type='booking_confirmation',
            title='Booking đã được xác nhận',
            message=f'Booking của bạn đã được xác nhận. Vui lòng chuẩn bị để check-in.'
        )


@receiver(m2m_changed, sender=Booking.rooms.through)
def booking_rooms_changed(sender, instance, action, **kwargs):
    """
     SIGNAL XỬ LÝ ROOM STATUS DỰA TRÊN BOOKING
    Signal này được trigger khi rooms của booking thay đổi (thêm/xóa phòng)
    Tự động cập nhật trạng thái phòng dựa trên:
    - Trạng thái booking (pending, confirmed, checked_in, etc.)
    - Thời gian check-in (future booking vs current booking)
    """
    print(f"Signal booking_rooms_changed: action={action}, booking={instance.id}, status={instance.status}")
    
    if action == "post_add":
        try:
            #  LOGIC CHÍNH: Cập nhật trạng thái phòng dựa trên trạng thái booking
            for room in instance.rooms.all():
                print(f"Processing room {room.room_number}, current status: {room.status}")
                
                if instance.status == BookingStatus.CHECKED_IN:
                    #  CHECKED_IN: Khách đã check-in thực tế → phòng chuyển thành 'occupied'
                    room.status = 'occupied'
                    room.save()
                    print(f"Room {room.room_number} status changed to occupied")
                    
                elif instance.status in [BookingStatus.PENDING, BookingStatus.CONFIRMED]:
                    #  LOGIC PHÂN BIỆT FUTURE vs CURRENT BOOKING
                    from django.utils import timezone
                    today = timezone.now().date()
                    checkin_date = instance.check_in_date.date()
                    
                    if checkin_date <= today:
                        #  CURRENT BOOKING: Đặt cho hôm nay/đã quá hạn → chuyển sang 'booked'
                        if room.status == 'available':
                            room.status = 'booked'
                            room.save()
                            print(f"Room {room.room_number} status changed to booked (same-day booking)")
                    else:
                        #  FUTURE BOOKING: Đặt cho tương lai → giữ nguyên 'available'
                        # Lợi ích: Phòng không bị "khóa" sớm, có thể đặt cho ngày khác
                        print(f"Room {room.room_number} kept as available (future booking: {checkin_date})")
                        
                elif instance.status in [BookingStatus.CHECKED_OUT, BookingStatus.CANCELLED, BookingStatus.NO_SHOW]:
                    #  GIẢI PHÓNG PHÒNG: Check-out, hủy hoặc no-show → phòng trở về 'available'
                    room.status = 'available'
                    room.save()
                    print(f"Room {room.room_number} status changed to available")
            
            #  CẬP NHẬT CUSTOMER STATS: Sau khi thêm rooms vào booking
            if instance.customer and instance.customer.role == 'customer':
                instance.customer.update_customer_type()
                print(f"Customer {instance.customer.username} stats updated")
        except Exception as e:
            print(f"Error in booking_rooms_changed signal: {e}")
            raise e


@receiver(post_save, sender=RoomRental)
def room_rental_post_save(sender, instance, created, **kwargs):
    """
    Signal xử lý sau khi RoomRental được lưu
    """
    if instance.customer and instance.customer.role == 'customer':
        instance.customer.update_customer_type()


@receiver(post_save, sender=Payment)  
def payment_post_save(sender, instance, created, **kwargs):
    """
    Signal xử lý sau khi Payment được lưu
    """
    if instance.customer and instance.customer.role == 'customer':
        instance.customer.update_customer_type()
        
    # Tạo thông báo khi thanh toán thành công
    if created and instance.status:
        Notification.objects.create(
            user=instance.customer,
            notification_type='booking_confirmation',
            title='Thanh toán thành công',
            message=f'Thanh toán {instance.transaction_id} đã được xử lý thành công. Số tiền: {instance.amount:,.0f} VND'
        )