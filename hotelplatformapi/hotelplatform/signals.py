from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import Booking, BookingStatus, Notification


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