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
from django.core.exceptions import ValidationError

fake = Faker('vi_VN')
UserModel = get_user_model()
logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Seed database with dummy data for development, ensuring state consistency and test cases'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Clear existing data before seeding')

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Seeding data...'))
        if kwargs['clear']:
            self.stdout.write("Clearing existing data...")
            User.objects.exclude(is_superuser=True).delete()
            Room.objects.all().delete()
            RoomType.objects.all().delete()
            Booking.objects.all().delete()
            RoomRental.objects.all().delete()
            Payment.objects.all().delete()
            DiscountCode.objects.all().delete()
            Notification.objects.all().delete()
            RoomImage.objects.all().delete()

        self.stdout.write(f"Initial available rooms: {Room.objects.filter(status='available').count()}")
        self.create_users()
        self.create_room_types()
        if RoomType.objects.count() == 0:
            logger.error("No room types created. Stopping seed process.")
            return
        self.create_rooms()
        self.stdout.write(f"Created {Room.objects.count()} rooms, {Room.objects.filter(status='available').count()} available")
        if Room.objects.count() == 0:
            logger.error("No rooms created. Stopping seed process.")
            return
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
        self.stdout.write("Creating users...")
        try:
            if not UserModel.objects.filter(username='admin').exists():
                UserModel.objects.create_superuser(
                    username='admin',
                    email='admin@example.com',
                    password='123',
                    full_name='Admin User',
                    role='admin',
                )
            for i in range(2):
                if not UserModel.objects.filter(username=f'owner{i+1}').exists():
                    UserModel.objects.create_user(
                        username=f'owner{i+1}',
                        email=f'owner{i+1}@example.com',
                        password='123',
                        full_name=fake.name(),
                        role='owner',
                    )
            for i in range(5):
                if not UserModel.objects.filter(username=f'staff{i+1}').exists():
                    UserModel.objects.create_user(
                        username=f'staff{i+1}',
                        email=f'staff{i+1}@example.com',
                        password='123',
                        full_name=fake.name(),
                        role='staff',
                    )
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
            self.stdout.write(f"Created {UserModel.objects.count()} users.")
        except Exception as e:
            logger.error(f"Error creating users: {str(e)}")
            raise

    def create_room_types(self):
        self.stdout.write("Creating room types...")
        try:
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
            self.stdout.write(f"Created {RoomType.objects.count()} room types.")
        except Exception as e:
            logger.error(f"Error creating room types: {str(e)}")
            raise

    def create_rooms(self):
        self.stdout.write("Creating rooms...")
        try:
            room_types = list(RoomType.objects.all())
            if not room_types:
                logger.error("No room types available to create rooms.")
                return
            floors = [1, 2, 3, 4, 5]
            rooms_per_floor = 10

            for floor in floors:
                for room_num in range(1, rooms_per_floor + 1):
                    room_number = f'{floor}{room_num:02d}'
                    Room.objects.get_or_create(
                        room_number=room_number,
                        defaults={
                            'room_type': random.choice(room_types),
                            'status': 'available',
                        }
                    )
            self.stdout.write(f"Created {Room.objects.count()} rooms, {Room.objects.filter(status='available').count()} available")
        except Exception as e:
            logger.error(f"Error creating rooms: {str(e)}")
            raise

    def create_room_images(self):
        self.stdout.write("Creating room images...")
        try:
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
            self.stdout.write(f"Created {RoomImage.objects.count()} room images.")
        except Exception as e:
            logger.error(f"Error creating room images: {str(e)}")
            raise

    def create_discount_codes(self):
        self.stdout.write("Creating discount codes...")
        try:
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
            self.stdout.write(f"Created {DiscountCode.objects.count()} discount codes.")
        except Exception as e:
            logger.error(f"Error creating discount codes: {str(e)}")
            raise

    def create_historical_bookings(self):
        """Tạo dữ liệu lịch sử cho Analytics (6 tháng qua)"""
        self.stdout.write("Creating historical bookings...")
        customers = list(UserModel.objects.filter(role='customer'))
        rooms = list(Room.objects.all())
        discount_codes = list(DiscountCode.objects.all())
        historical_bookings_created = 0

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

                if check_in >= check_out or check_in > month_end:
                    continue

                available_rooms = [r for r in rooms if self.is_room_available([r], check_in, check_out)]
                if not available_rooms:
                    logger.warning(f"No available rooms for booking from {check_in} to {check_out}")
                    continue
                num_rooms = random.randint(1, min(2, len(available_rooms)))
                room_sample = random.sample(available_rooms, k=num_rooms)

                min_max_guests = min(r.room_type.max_guests for r in room_sample)
                guest_count = random.randint(1, min_max_guests)
                stay_days = (check_out.date() - check_in.date()).days or 1
                total_price = sum(room.room_type.base_price * stay_days for room in room_sample)

                # Kiểm tra trạng thái phòng và số lượng khách
                for room in room_sample:
                    if room.status != 'available':
                        logger.warning(f"Room {room.room_number} is not available (status: {room.status})")
                        continue
                    if guest_count > room.room_type.max_guests:
                        logger.warning(f"Guest count {guest_count} exceeds max guests {room.room_type.max_guests} for room {room.room_number}")
                        continue

                try:
                    with transaction.atomic():
                        booking = Booking(
                            customer=customer,
                            check_in_date=check_in,
                            check_out_date=check_out,
                            total_price=total_price,
                            guest_count=guest_count,
                            status=BookingStatus.CHECKED_OUT,
                            special_requests=fake.text(max_nb_chars=100) if random.choice([True, False]) else None,
                        )
                        booking.save(force_insert=True)
                        booking.rooms.set(room_sample)
                        for room in room_sample:
                            room.status = 'available'
                            room.save()

                        real_check_in = check_in + timedelta(minutes=random.randint(-30, 30))
                        real_check_out = check_out + timedelta(minutes=random.randint(-60, 60))
                        rental = RoomRental(
                            booking=booking,
                            customer=customer,
                            check_in_date=real_check_in,
                            check_out_date=check_out,
                            actual_check_out_date=real_check_out,
                            total_price=total_price,
                            guest_count=guest_count,
                        )
                        rental.save()
                        rental.rooms.set(room_sample)

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
                        historical_bookings_created += 1
                except ValidationError as e:
                    logger.error(f"ValidationError creating historical booking for {customer.full_name}: {str(e)}")
                    continue
                except Exception as e:
                    logger.error(f"Unexpected error creating historical booking for {customer.full_name}: {str(e)}")
                    continue

        self.stdout.write(f'Created {historical_bookings_created} historical bookings.')

    def create_current_bookings(self):
        """Tạo booking hiện tại và tương lai, thêm dữ liệu kiểm thử check-in/check-out"""
        self.stdout.write("Creating current bookings...")
        customers = list(UserModel.objects.filter(role='customer'))
        rooms = list(Room.objects.filter(status='available'))
        current_time = timezone.now()
        confirmed_bookings_created = 0
        checked_in_bookings_created = 0

        confirmed_bookings_target = 5
        while confirmed_bookings_created < confirmed_bookings_target and rooms:
            customer = random.choice(customers)
            check_in = current_time - timedelta(days=random.randint(0, 1), hours=random.randint(0, 6))
            check_out = check_in + timedelta(days=random.randint(1, 5), hours=random.randint(10, 12))

            if check_in >= check_out:
                continue

            available_rooms = [r for r in rooms if self.is_room_available([r], check_in, check_out)]
            if not available_rooms:
                logger.warning(f"No available rooms for confirmed booking from {check_in} to {check_out}")
                continue
            num_rooms = random.randint(1, min(2, len(available_rooms)))
            room_sample = random.sample(available_rooms, k=num_rooms)

            min_max_guests = min(r.room_type.max_guests for r in room_sample)
            guest_count = random.randint(1, min_max_guests)
            stay_days = (check_out.date() - check_in.date()).days or 1
            total_price = sum(room.room_type.base_price * stay_days for room in room_sample)

            # Kiểm tra trạng thái phòng và số lượng khách
            for room in room_sample:
                if room.status != 'available':
                    logger.warning(f"Room {room.room_number} is not available (status: {room.status})")
                    continue
                if guest_count > room.room_type.max_guests:
                    logger.warning(f"Guest count {guest_count} exceeds max guests {room.room_type.max_guests} for room {room.room_number}")
                    continue

            try:
                with transaction.atomic():
                    booking = Booking(
                        customer=customer,
                        check_in_date=check_in,
                        check_out_date=check_out,
                        total_price=total_price,
                        guest_count=guest_count,
                        status=BookingStatus.CONFIRMED,
                        special_requests=fake.text(max_nb_chars=50) if random.choice([True, False]) else None,
                    )
                    booking.save(force_insert=True)
                    booking.rooms.set(room_sample)
                    for room in room_sample:
                        room.status = 'booked'
                        room.save()
                    rooms = [r for r in rooms if r not in room_sample]
                    confirmed_bookings_created += 1
            except ValidationError as e:
                logger.error(f"ValidationError creating confirmed booking for {customer.full_name}: {str(e)}")
                continue
            except Exception as e:
                logger.error(f"Unexpected error creating confirmed booking for {customer.full_name}: {str(e)}")
                continue

        self.stdout.write(f'Created {confirmed_bookings_created} confirmed bookings for check-in testing.')

        checked_in_bookings_target = 5
        while checked_in_bookings_created < checked_in_bookings_target and rooms:
            customer = random.choice(customers)
            check_in = current_time - timedelta(days=random.randint(0, 3), hours=random.randint(0, 6))
            check_out = current_time + timedelta(days=random.randint(1, 4), hours=random.randint(10, 12))

            if check_in >= check_out:
                continue

            available_rooms = [r for r in rooms if self.is_room_available([r], check_in, check_out)]
            if not available_rooms:
                logger.warning(f"No available rooms for checked-in booking from {check_in} to {check_out}")
                continue
            num_rooms = random.randint(1, min(2, len(available_rooms)))
            room_sample = random.sample(available_rooms, k=num_rooms)

            min_max_guests = min(r.room_type.max_guests for r in room_sample)
            guest_count = random.randint(1, min_max_guests)
            stay_days = (check_out.date() - check_in.date()).days or 1
            total_price = sum(room.room_type.base_price * stay_days for room in room_sample)

            # Kiểm tra trạng thái phòng và số lượng khách
            for room in room_sample:
                if room.status != 'available':
                    logger.warning(f"Room {room.room_number} is not available (status: {room.status})")
                    continue
                if guest_count > room.room_type.max_guests:
                    logger.warning(f"Guest count {guest_count} exceeds max guests {room.room_type.max_guests} for room {room.room_number}")
                    continue

            try:
                with transaction.atomic():
                    booking = Booking(
                        customer=customer,
                        check_in_date=check_in,
                        check_out_date=check_out,
                        total_price=total_price,
                        guest_count=guest_count,
                        status=BookingStatus.CHECKED_IN,
                    )
                    booking.save(force_insert=True)
                    booking.rooms.set(room_sample)
                    for room in room_sample:
                        room.status = 'occupied'
                        room.save()

                    real_check_in = check_in + timedelta(minutes=random.randint(-30, 30))
                    rental = RoomRental(
                        booking=booking,
                        customer=customer,
                        check_in_date=real_check_in,
                        check_out_date=check_out,
                        total_price=total_price,
                        guest_count=guest_count,
                    )
                    rental.save()
                    rental.rooms.set(room_sample)
                    rooms = [r for r in rooms if r not in room_sample]
                    checked_in_bookings_created += 1
            except ValidationError as e:
                logger.error(f"ValidationError creating checked-in booking for {customer.full_name}: {str(e)}")
                continue
            except Exception as e:
                logger.error(f"Unexpected error creating checked-in booking for {customer.full_name}: {str(e)}")
                continue

        self.stdout.write(f'Created {checked_in_bookings_created} checked-in bookings for check-out testing.')

    def create_walk_in_rentals(self):
        """Tạo RoomRental cho khách vãng lai (không có Booking) - để kiểm thử QR payment"""
        self.stdout.write("Creating walk-in rentals...")
        customers = list(UserModel.objects.filter(role='customer'))
        rooms = list(Room.objects.filter(status='available'))
        walk_in_rentals_target = 3
        walk_in_rentals_created = 0
        current_time = timezone.now()

        while walk_in_rentals_created < walk_in_rentals_target and rooms:
            customer = random.choice(customers)
            check_in = current_time - timedelta(days=random.randint(0, 3), hours=random.randint(0, 6))
            check_out = current_time + timedelta(days=random.randint(1, 4), hours=random.randint(10, 12))

            if check_in >= check_out:
                continue

            available_rooms = [r for r in rooms if self.is_room_available([r], check_in, check_out)]
            if not available_rooms:
                logger.warning(f"No available rooms for walk-in rental from {check_in} to {check_out}")
                continue
            num_rooms = random.randint(1, min(2, len(available_rooms)))
            room_sample = random.sample(available_rooms, k=num_rooms)

            min_max_guests = min(r.room_type.max_guests for r in room_sample)
            guest_count = random.randint(1, min_max_guests)
            stay_days = (check_out.date() - check_in.date()).days or 1
            total_price = sum(room.room_type.base_price * stay_days for room in room_sample)

            # Kiểm tra trạng thái phòng và số lượng khách
            for room in room_sample:
                if room.status != 'available':
                    logger.warning(f"Room {room.room_number} is not available (status: {room.status})")
                    continue
                if guest_count > room.room_type.max_guests:
                    logger.warning(f"Guest count {guest_count} exceeds max guests {room.room_type.max_guests} for room {room.room_number}")
                    continue

            try:
                with transaction.atomic():
                    rental = RoomRental(
                        customer=customer,
                        check_in_date=check_in,
                        check_out_date=check_out,
                        total_price=total_price,
                        guest_count=guest_count,
                    )
                    rental.save()
                    rental.rooms.set(room_sample)
                    for room in room_sample:
                        room.status = 'occupied'
                        room.save()
                    rooms = [r for r in rooms if r not in room_sample]
                    walk_in_rentals_created += 1
            except ValidationError as e:
                logger.error(f"ValidationError creating walk-in rental for {customer.full_name}: {str(e)}")
                continue
            except Exception as e:
                logger.error(f"Unexpected error creating walk-in rental for {customer.full_name}: {str(e)}")
                continue

        self.stdout.write(f'Created {walk_in_rentals_created} walk-in rentals for QR payment testing.')

    def create_notifications(self):
        self.stdout.write("Creating notifications...")
        try:
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
            self.stdout.write(f"Created {Notification.objects.count()} notifications.")
        except Exception as e:
            logger.error(f"Error creating notifications: {str(e)}")
            raise

    def update_customer_stats(self):
        self.stdout.write('Updating customer statistics...')
        try:
            customers = UserModel.objects.filter(role='customer')
            for customer in customers:
                customer.update_customer_type()
            self.stdout.write(f'Updated stats for {customers.count()} customers.')
        except Exception as e:
            logger.error(f"Error updating customer stats: {str(e)}")
            raise