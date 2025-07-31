from django.db.models.signals import post_save, pre_save, post_migrate, m2m_changed
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.apps import apps
from .models import Booking, BookingStatus, Notification, RoomRental, Payment

User = get_user_model()


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
    
    # Nếu booking được xác nhận và chưa có QR code
    if instance.status == BookingStatus.CONFIRMED and not instance.qr_code:
        try:
            # Tạo QR code
            qr_code_url = instance.generate_qr_code()
            
            # Tạo thông báo cho customer
            Notification.objects.create(
                user=instance.customer,
                notification_type='booking_confirmation',
                title='Booking đã được xác nhận',
                message=f'Booking của bạn đã được xác nhận. Vui lòng sử dụng QR code để check-in.'
            )
            
        except Exception as e:
            print(f"Lỗi khi tạo QR code: {e}")


@receiver(m2m_changed, sender=Booking.rooms.through)
def booking_rooms_changed(sender, instance, action, **kwargs):
    """
    Signal xử lý khi rooms của booking thay đổi
    """
    if action == "post_add":
        # Cập nhật trạng thái phòng dựa trên trạng thái booking
        for room in instance.rooms.all():
            if instance.status == BookingStatus.CHECKED_IN:
                # Khi check-in, phòng chuyển thành occupied
                room.status = 'occupied'
                room.save()
            elif instance.status in [BookingStatus.PENDING, BookingStatus.CONFIRMED]:
                # Khi pending hoặc confirmed, phòng chuyển thành booked
                if room.status == 'available':  # Chỉ update nếu phòng đang available
                    room.status = 'booked'
                    room.save()
            elif instance.status in [BookingStatus.CHECKED_OUT, BookingStatus.CANCELLED, BookingStatus.NO_SHOW]:
                # Khi check-out, hủy hoặc no-show, phòng trở về available
                room.status = 'available'
                room.save()
        
        # Sau khi thêm rooms vào booking, cập nhật customer stats
        if instance.customer and instance.customer.role == 'customer':
            instance.customer.update_customer_type()


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