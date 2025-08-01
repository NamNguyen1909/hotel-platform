import random
import logging
from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker
from hotelplatform.models import User, RoomType, Room, Booking, RoomRental, Payment, DiscountCode, Notification, RoomImage, BookingStatus
from django.contrib.auth import get_user_model
from decimal import Decimal
from datetime import timedelta
from django.db import transaction

fake = Faker('vi_VN')
UserModel = get_user_model()
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Seed database with dummy data for development, ensuring state consistency and test cases'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Seeding data...'))
        self.create_users()
        self.create_room_types()
        self.create_rooms()
        self.create_room_images()
        self.create_discount_codes()
        self.create_historical_bookings()
        self.create_current_bookings()
        self.create_walk_in_rentals()
        self.create_notifications()
        self.update_customer_stats()
        self.stdout.write(self.style.SUCCESS('Done! Created comprehensive sample data for check-in/check-out testing.'))

    def is_room_available(self, rooms, check_in, check_out):
        """Kiểm tra xem các phòng có bị trùng với booking hoặc rental khác không"""
        overlapping_bookings = Booking.objects.filter(
            rooms__in=rooms,
            status__in=['pending', 'confirmed', 'checked_in'],
            check_in_date__lt=check_out,
            check_out_date__gt=check_in
        )
        overlapping_rentals = RoomRental.objects.filter(
            rooms__in=rooms,
            check_in_date__lt=check_out,
            actual_check_out_date__isnull=True
        ) | RoomRental.objects.filter(
            rooms__in=rooms,
            check_in_date__lt=check_out,
            actual_check_out_date__gt=check_in
        )
        return not (overlapping_bookings.exists() or overlapping_rentals.exists())

    def create_users(self):
        # Admin
        if not UserModel.objects.filter(username='admin').exists():
            UserModel.objects.create_superuser(
                username='admin',
                email='admin@example.com',
                password='123',
                full_name='Admin User',
                role='admin',
            )

        # Owners
        for i in range(2):
            if not UserModel.objects.filter(username=f'owner{i+1}').exists():
                UserModel.objects.create_user(
                    username=f'owner{i+1}',
                    email=f'owner{i+1}@example.com',
                    password='123',
                    full_name=fake.name(),
                    role='owner',
                )

        # Staff
        for i in range(5):
            if not UserModel.objects.filter(username=f'staff{i+1}').exists():
                UserModel.objects.create_user(
                    username=f'staff{i+1}',
                    email=f'staff{i+1}@example.com',
                    password='123',
                    full_name=fake.name(),
                    role='staff',
                )

        # Customers
        for i in range(25):
            if not UserModel.objects.filter(username=f'customer{i+1}').exists():
                UserModel.objects.create_user(
                    username=f'customer{i+1}',
                    email=f'customer{i+1}@example.com',
                    password='123',
                    full_name=fake.name(),
                    role='customer',
                    phone=fake.phone_number(),
                    address=fake.address(),
                    id_card=fake.random_number(digits=12, fix_len=True),
                )

    def create_room_types(self):
        types = [
            ('Phòng đơn', 'Phòng tiêu chuẩn cho 1 người', 500000, 1),
            ('Phòng đôi', 'Phòng rộng rãi cho 2 người', 800000, 2),
            ('Phòng gia đình', 'Phòng lớn cho gia đình', 1200000, 4),
            ('Phòng VIP', 'Phòng cao cấp với view đẹp', 2000000, 4),
            ('Suite', 'Phòng hạng sang với phòng khách', 3500000, 6),
        ]
        for name, desc, price, max_guests in types:
            RoomType.objects.get_or_create(
                name=name,
                defaults={
                    'description': desc,
                    'base_price': Decimal(price),
                    'max_guests': max_guests,
                    'extra_guest_surcharge': Decimal('25.00'),
                    'amenities': 'Wifi miễn phí, Điều hòa, TV LCD, Minibar, Két sắt, Phòng tắm riêng',
                }
            )

    def create_rooms(self):
        room_types = list(RoomType.objects.all())
        floors = [1, 2, 3, 4, 5]
        rooms_per_floor = 10

        for floor in floors:
            for room_num in range(1, rooms_per_floor + 1):
                room_number = f'{floor}{room_num:02d}'
                Room.objects.get_or_create(
                    room_number=room_number,
                    defaults={
                        'room_type': random.choice(room_types),
                        'status': 'available',  # Tất cả phòng bắt đầu với trạng thái available
                    }
                )

    def create_room_images(self):
        rooms = Room.objects.all()
        image_captions = [
            'Phòng ngủ chính', 'Phòng tắm', 'View từ cửa sổ',
            'Góc làm việc', 'Ban công', 'Khu vực nghỉ ngơi'
        ]

        for room in rooms:
            num_images = random.randint(2, 4)
            for i in range(num_images):
                is_primary = (i == 0)
                RoomImage.objects.get_or_create(
                    room=room,
                    caption=random.choice(image_captions),
                    defaults={'is_primary': is_primary}
                )

    def create_discount_codes(self):
        codes_data = [
            ('WELCOME2024', 15, 30, 100),
            ('VIP20', 20, 60, 50),
            ('SUMMER10', 10, 90, 200),
            ('WEEKEND5', 5, 30, 300),
            ('NEWCUSTOMER', 25, 90, 150),
        ]

        for code, discount, days, max_uses in codes_data:
            DiscountCode.objects.get_or_create(
                code=code,
                defaults={
                    'discount_percentage': Decimal(discount),
                    'valid_from': timezone.now() - timedelta(days=random.randint(1, 10)),
                    'valid_to': timezone.now() + timedelta(days=days),
                    'max_uses': max_uses,
                    'used_count': random.randint(0, max_uses // 3),
                    'is_active': True,
                }
            )

    def create_historical_bookings(self):
        """Tạo dữ liệu lịch sử cho Analytics (6 tháng qua)"""
        customers = list(UserModel.objects.filter(role='customer'))
        rooms = list(Room.objects.all())
        discount_codes = list(DiscountCode.objects.all())

        for month_offset in range(6, 0, -1):
            month_start = timezone.now() - timedelta(days=month_offset * 30)
            month_end = month_start + timedelta(days=30)
            num_bookings = random.randint(10, 15)

            for _ in range(num_bookings):
                customer = random.choice(customers)
                check_in = month_start + timedelta(
                    days=random.randint(0, 25),
                    hours=random.randint(14, 18)
                )
                check_out = check_in + timedelta(
                    days=random.randint(1, 7),
                    hours=random.randint(10, 12)
                )

                # Chọn phòng available
                available_rooms = [r for r in rooms if self.is_room_available([r], check_in, check_out)]
                if not available_rooms:
                    continue
                num_rooms = random.randint(1, min(2, len(available_rooms)))
                room_sample = random.sample(available_rooms, k=num_rooms)

                # Kiểm tra guest_count dựa trên phòng có max_guests nhỏ nhất
                min_max_guests = min(r.room_type.max_guests for r in room_sample)
                guest_count = random.randint(1, min_max_guests)
                stay_days = (check_out.date() - check_in.date()).days or 1
                total_price = sum(room.room_type.base_price * stay_days for room in room_sample)

                with transaction.atomic():
                    booking = Booking.objects.create(
                        customer=customer,
                        check_in_date=check_in,
                        check_out_date=check_out,
                        total_price=total_price,
                        guest_count=guest_count,
                        status=BookingStatus.CHECKED_OUT,
                        special_requests=fake.text(max_nb_chars=100) if random.choice([True, False]) else None,
                    )
                    booking.rooms.set(room_sample)
                    logger.info(f'Created Booking ID {booking.id} with status {booking.status}')

                    # Tạo RoomRental với thời gian thực tế
                    real_check_in = check_in + timedelta(minutes=random.randint(-30, 30))
                    real_check_out = check_out + timedelta(minutes=random.randint(-60, 60))
                    rental = RoomRental.objects.create(
                        booking=booking,
                        customer=customer,
                        check_in_date=real_check_in,
                        check_out_date=check_out,
                        actual_check_out_date=real_check_out,
                        total_price=total_price,
                        guest_count=guest_count,
                    )
                    rental.rooms.set(room_sample)
                    logger.info(f'Created RoomRental ID {rental.id} with check_in_date {rental.check_in_date}')

                    # Tạo Payment
                    final_amount = total_price
                    discount_applied = None
                    if random.random() < 0.3 and discount_codes:
                        discount_applied = random.choice(discount_codes)
                        final_amount = total_price * (1 - discount_applied.discount_percentage / 100)

                    Payment.objects.create(
                        rental=rental,
                        customer=customer,
                        amount=final_amount,
                        payment_method=random.choice(['stripe', 'vnpay', 'cash']),
                        status=True,
                        paid_at=real_check_out + timedelta(hours=random.randint(0, 2)),
                        transaction_id=f'HST{month_offset}{fake.random_number(digits=6, fix_len=True)}',
                        discount_code=discount_applied,
                    )

    def create_current_bookings(self):
        """Tạo booking hiện tại và tương lai, thêm dữ liệu kiểm thử check-in/check-out"""
        customers = list(UserModel.objects.filter(role='customer'))
        rooms = list(Room.objects.filter(status='available'))
        current_time = timezone.now()  # Sử dụng thời gian hiện tại

        # Booking hiện tại (confirmed) - để kiểm thử check-in
        confirmed_bookings_target = 5
        confirmed_bookings_created = 0

        while confirmed_bookings_created < confirmed_bookings_target and rooms:
            customer = random.choice(customers)
            # Đặt check_in_date là hôm nay hoặc hôm qua để có thể check-in ngay
            check_in = current_time - timedelta(days=random.randint(0, 1), hours=random.randint(0, 6))
            check_out = check_in + timedelta(days=random.randint(1, 5), hours=random.randint(10, 12))

            available_rooms = [r for r in rooms if self.is_room_available([r], check_in, check_out)]
            if not available_rooms:
                break
            num_rooms = random.randint(1, min(2, len(available_rooms)))
            room_sample = random.sample(available_rooms, k=num_rooms)

            # Kiểm tra guest_count dựa trên phòng có max_guests nhỏ nhất
            min_max_guests = min(r.room_type.max_guests for r in room_sample)
            guest_count = random.randint(1, min_max_guests)
            stay_days = (check_out.date() - check_in.date()).days or 1
            total_price = sum(room.room_type.base_price * stay_days for room in room_sample)

            with transaction.atomic():
                booking = Booking.objects.create(
                    customer=customer,
                    check_in_date=check_in,
                    check_out_date=check_out,
                    total_price=total_price,
                    guest_count=guest_count,
                    status=BookingStatus.CONFIRMED,
                    special_requests=fake.text(max_nb_chars=50) if random.choice([True, False]) else None,
                )
                booking.rooms.set(room_sample)
                logger.info(f'Created Booking ID {booking.id} with status {booking.status}')

                rooms = [r for r in rooms if r not in room_sample]
                confirmed_bookings_created += 1

        self.stdout.write(f'Created {confirmed_bookings_created} confirmed bookings for check-in testing.')

        # Booking hiện tại (checked_in) - để kiểm thử check-out
        checked_in_bookings_target = 5
        checked_in_bookings_created = 0

        while checked_in_bookings_created < checked_in_bookings_target and rooms:
            customer = random.choice(customers)
            check_in = current_time - timedelta(days=random.randint(0, 3), hours=random.randint(0, 6))
            check_out = current_time + timedelta(days=random.randint(1, 4), hours=random.randint(10, 12))

            available_rooms = [r for r in rooms if self.is_room_available([r], check_in, check_out)]
            if not available_rooms:
                break
            num_rooms = random.randint(1, min(2, len(available_rooms)))
            room_sample = random.sample(available_rooms, k=num_rooms)

            # Kiểm tra guest_count dựa trên phòng có max_guests nhỏ nhất
            min_max_guests = min(r.room_type.max_guests for r in room_sample)
            guest_count = random.randint(1, min_max_guests)
            stay_days = (check_out.date() - check_in.date()).days or 1
            total_price = sum(room.room_type.base_price * stay_days for room in room_sample)

            with transaction.atomic():
                booking = Booking.objects.create(
                    customer=customer,
                    check_in_date=check_in,
                    check_out_date=check_out,
                    total_price=total_price,
                    guest_count=guest_count,
                    status=BookingStatus.CHECKED_IN,
                )
                booking.rooms.set(room_sample)
                logger.info(f'Created Booking ID {booking.id} with status {booking.status}')

                # Tạo RoomRental (mô phỏng check-in thực tế)
                real_check_in = check_in + timedelta(minutes=random.randint(-30, 30))
                rental = RoomRental.objects.create(
                    booking=booking,
                    customer=customer,
                    check_in_date=real_check_in,
                    check_out_date=check_out,
                    total_price=total_price,
                    guest_count=guest_count,
                )
                rental.rooms.set(room_sample)
                logger.info(f'Created RoomRental ID {rental.id} with check_in_date {rental.check_in_date}')

                rooms = [r for r in rooms if r not in room_sample]
                checked_in_bookings_created += 1

        self.stdout.write(f'Created {checked_in_bookings_created} checked-in bookings for check-out testing.')

    def create_walk_in_rentals(self):
        """Tạo RoomRental cho khách vãng lai (không có Booking) - để kiểm thử QR payment"""
        customers = list(UserModel.objects.filter(role='customer'))
        rooms = list(Room.objects.filter(status='available'))
        walk_in_rentals_target = 3
        walk_in_rentals_created = 0
        current_time = timezone.now()  # Sử dụng thời gian hiện tại

        while walk_in_rentals_created < walk_in_rentals_target and rooms:
            customer = random.choice(customers)
            check_in = current_time - timedelta(days=random.randint(0, 3), hours=random.randint(0, 6))
            check_out = current_time + timedelta(days=random.randint(1, 4), hours=random.randint(10, 12))

            available_rooms = [r for r in rooms if self.is_room_available([r], check_in, check_out)]
            if not available_rooms:
                break
            num_rooms = random.randint(1, min(2, len(available_rooms)))
            room_sample = random.sample(available_rooms, k=num_rooms)

            # Kiểm tra guest_count dựa trên phòng có max_guests nhỏ nhất
            min_max_guests = min(r.room_type.max_guests for r in room_sample)
            guest_count = random.randint(1, min_max_guests)
            stay_days = (check_out.date() - check_in.date()).days or 1
            total_price = sum(room.room_type.base_price * stay_days for room in room_sample)

            with transaction.atomic():
                rental = RoomRental.objects.create(
                    customer=customer,
                    check_in_date=check_in,
                    check_out_date=check_out,
                    total_price=total_price,
                    guest_count=guest_count,
                )
                rental.rooms.set(room_sample)
                logger.info(f'Created walk-in RoomRental ID {rental.id} with check_in_date {rental.check_in_date}')

                rooms = [r for r in rooms if r not in room_sample]
                walk_in_rentals_created += 1

        self.stdout.write(f'Created {walk_in_rentals_created} walk-in rentals for QR payment testing.')

    def create_notifications(self):
        users = UserModel.objects.filter(role__in=['customer', 'staff'])
        notification_templates = [
            ('booking_confirmation', 'Xác nhận đặt phòng', 'Đặt phòng của bạn đã được xác nhận.'),
            ('check_in_reminder', 'Nhắc nhở nhận phòng', 'Đừng quên nhận phòng vào ngày mai.'),
            ('check_out_reminder', 'Nhắc nhở trả phòng', 'Hôm nay là ngày trả phòng của bạn.'),
            ('promotion', 'Khuyến mãi đặc biệt', 'Giảm 20% cho đặt phòng cuối tuần!'),
            ('promotion', 'Ưu đãi VIP', 'Chúc mừng! Bạn đã trở thành khách VIP.'),
        ]

        for user in users:
            num_notifications = random.randint(2, 5)
            for _ in range(num_notifications):
                notification_type, title, message = random.choice(notification_templates)
                created_at = timezone.now() - timedelta(days=random.randint(0, 30))
                is_read = random.choice([True, False])
                read_at = created_at + timedelta(hours=random.randint(1, 48)) if is_read else None

                Notification.objects.create(
                    user=user,
                    notification_type=notification_type,
                    title=title,
                    message=message + f' {fake.text(max_nb_chars=50)}',
                    created_at=created_at,
                    is_read=is_read,
                    read_at=read_at,
                )

    def update_customer_stats(self):
        self.stdout.write('Updating customer statistics...')
        customers = UserModel.objects.filter(role='customer')
        for customer in customers:
            customer.update_customer_type()
        self.stdout.write(f'Updated stats for {customers.count()} customers.')
        
        # Hiển thị phân phối trạng thái phòng
        self.show_room_status_distribution()
    
    def show_room_status_distribution(self):
        """Hiển thị phân phối trạng thái phòng sau khi seed"""
        from django.db.models import Count
        
        room_stats = Room.objects.values('status').annotate(count=Count('status')).order_by('status')
        total_rooms = Room.objects.count()
        
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('PHÂN PHỐI TRẠNG THÁI PHÒNG:'))
        self.stdout.write('='*50)
        
        for stat in room_stats:
            percentage = (stat['count'] / total_rooms) * 100 if total_rooms > 0 else 0
            status_display = {
                'available': 'Trống',
                'booked': 'Đã đặt', 
                'occupied': 'Đang sử dụng'
            }.get(stat['status'], stat['status'])
            
            self.stdout.write(f"• {status_display}: {stat['count']} phòng ({percentage:.1f}%)")
        
        self.stdout.write(f"\nTổng cộng: {total_rooms} phòng")
        self.stdout.write('='*50)