import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker
from hotelplatform.models import User, RoomType, Room, Booking, RoomRental, Payment, DiscountCode, Notification, RoomImage, BookingStatus
from django.contrib.auth import get_user_model
from decimal import Decimal
from datetime import datetime, timedelta

fake = Faker('vi_VN')
UserModel = get_user_model()

class Command(BaseCommand):
    help = 'Seed database with dummy data for development'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Seeding data...'))
        self.create_users()
        self.create_room_types()
        self.create_rooms()
        self.create_room_images()
        self.create_discount_codes()
        self.create_historical_bookings()  # Tạo dữ liệu lịch sử
        self.create_current_bookings()     # Tạo booking hiện tại
        self.create_notifications()
        self.stdout.write(self.style.SUCCESS('Done! Created comprehensive sample data.'))

    def create_users(self):
        # Admin (sử dụng signal tự động tạo)
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
                
        # Customers with varied customer types
        for i in range(25):
            if not UserModel.objects.filter(username=f'customer{i+1}').exists():
                customer = UserModel.objects.create_user(
                    username=f'customer{i+1}',
                    email=f'customer{i+1}@example.com',
                    password='123',
                    full_name=fake.name(),
                    role='customer',
                    phone=fake.phone_number(),
                    address=fake.address(),
                    id_card=fake.random_number(digits=12, fix_len=True),
                )
                # Set some customers as VIP/Super VIP for testing
                if i < 3:
                    customer.total_bookings = random.randint(20, 30)
                    customer.total_spent = Decimal(random.randint(5000, 10000))
                    customer.customer_type = 'super_vip'
                elif i < 8:
                    customer.total_bookings = random.randint(10, 19)
                    customer.total_spent = Decimal(random.randint(2000, 4999))
                    customer.customer_type = 'vip'
                elif i < 15:
                    customer.total_bookings = random.randint(3, 9)
                    customer.total_spent = Decimal(random.randint(500, 1999))
                    customer.customer_type = 'regular'
                customer.save()

    def create_room_types(self):
        types = [
            ('Phòng đơn', 'Phòng tiêu chuẩn cho 1 người với đầy đủ tiện nghi cơ bản', 500, 1),
            ('Phòng đôi', 'Phòng rộng rãi cho 2 người với 1 giường đôi', 800, 2),
            ('Phòng gia đình', 'Phòng lớn phù hợp cho gia đình nhỏ', 1200, 4),
            ('Phòng VIP', 'Phòng cao cấp với view đẹp và dịch vụ đặc biệt', 2000, 4),
            ('Suite', 'Phòng hạng sang với phòng khách riêng biệt', 3500, 6),
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
        floors = [1, 2, 3, 4, 5]  # 5 tầng
        rooms_per_floor = 10      # 10 phòng mỗi tầng
        
        for floor in floors:
            for room_num in range(1, rooms_per_floor + 1):
                room_number = f'{floor}{room_num:02d}'  # 101, 102, ..., 510
                Room.objects.get_or_create(
                    room_number=room_number,
                    defaults={
                        'room_type': random.choice(room_types),
                        'status': random.choice(['available', 'available', 'available', 'booked', 'occupied']),  # Bias towards available
                    }
                )

    def create_room_images(self):
        """Tạo ảnh mẫu cho các phòng"""
        rooms = Room.objects.all()
        image_captions = [
            'Phòng ngủ chính',
            'Phòng tắm',
            'View từ cửa sổ',
            'Góc làm việc',
            'Ban công',
            'Khu vực nghỉ ngơi'
        ]
        
        for room in rooms:
            # Tạo 2-4 ảnh cho mỗi phòng
            num_images = random.randint(2, 4)
            for i in range(num_images):
                is_primary = (i == 0)  # Ảnh đầu tiên là ảnh chính
                RoomImage.objects.get_or_create(
                    room=room,
                    caption=random.choice(image_captions),
                    defaults={
                        'is_primary': is_primary,
                        # Note: image field để trống vì sử dụng CloudinaryField
                    }
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
        """Tạo dữ liệu booking lịch sử cho Analytics (6 tháng qua)"""
        customers = list(UserModel.objects.filter(role='customer'))
        rooms = list(Room.objects.all())
        discount_codes = list(DiscountCode.objects.all())
        
        # Tạo booking cho 6 tháng qua
        for month_offset in range(6, 0, -1):
            month_start = timezone.now() - timedelta(days=month_offset * 30)
            month_end = month_start + timedelta(days=30)
            
            # Số booking mỗi tháng (15-25 booking)
            num_bookings = random.randint(15, 25)
            
            for _ in range(num_bookings):
                customer = random.choice(customers)
                
                # Random check-in date trong tháng
                check_in = month_start + timedelta(
                    days=random.randint(0, 25),
                    hours=random.randint(14, 18)  # Check-in từ 2-6PM
                )
                check_out = check_in + timedelta(
                    days=random.randint(1, 7),
                    hours=random.randint(10, 12)  # Check-out từ 10-12PM
                )
                
                # Random rooms (1-3 phòng)
                room_sample = random.sample(rooms, k=random.randint(1, 3))
                total_price = sum([r.room_type.base_price for r in room_sample])
                guest_count = random.randint(1, min(4, sum([r.room_type.max_guests for r in room_sample])))
                
                # Tạo booking (chủ yếu là checked_out cho lịch sử)
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
                
                # Tạo RoomRental
                rental = RoomRental.objects.create(
                    booking=booking,
                    customer=customer,
                    check_out_date=check_out,
                    total_price=total_price,
                    guest_count=guest_count,
                )
                rental.rooms.set(room_sample)
                
                # Tạo Payment
                discount_applied = None
                final_amount = total_price
                
                # 30% chance có discount
                if random.random() < 0.3 and discount_codes:
                    discount_applied = random.choice(discount_codes)
                    discount_amount = total_price * (discount_applied.discount_percentage / 100)
                    final_amount = total_price - discount_amount
                
                payment = Payment.objects.create(
                    rental=rental,
                    customer=customer,
                    amount=final_amount,
                    payment_method=random.choice(['stripe', 'vnpay', 'cash']),
                    status=True,
                    paid_at=check_out + timedelta(hours=random.randint(0, 2)),
                    transaction_id=f'HST{month_offset}{fake.random_number(digits=6, fix_len=True)}',
                    discount_code=discount_applied,
                )

    def create_current_bookings(self):
        """Tạo booking hiện tại và tương lai"""
        customers = list(UserModel.objects.filter(role='customer'))
        rooms = list(Room.objects.filter(status='available'))
        
        # Booking trong tương lai (pending, confirmed) - chỉ trong vòng 28 ngày
        for i in range(15):
            customer = random.choice(customers)
            check_in = timezone.now() + timedelta(days=random.randint(1, 27))  # Tối đa 27 ngày để tránh lỗi validation
            check_out = check_in + timedelta(days=random.randint(1, 5))
            
            room_sample = random.sample(rooms, k=random.randint(1, 2))
            total_price = sum([r.room_type.base_price for r in room_sample])
            
            booking = Booking.objects.create(
                customer=customer,
                check_in_date=check_in,
                check_out_date=check_out,
                total_price=total_price,
                guest_count=random.randint(1, 3),
                status=random.choice([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
                special_requests=fake.text(max_nb_chars=50) if random.choice([True, False]) else None,
            )
            booking.rooms.set(room_sample)
        
        # Booking hiện tại (checked_in)
        for i in range(8):
            customer = random.choice(customers)
            check_in = timezone.now() - timedelta(days=random.randint(0, 3))
            check_out = timezone.now() + timedelta(days=random.randint(1, 4))
            
            room_sample = random.sample(rooms, k=random.randint(1, 2))
            total_price = sum([r.room_type.base_price for r in room_sample])
            
            booking = Booking.objects.create(
                customer=customer,
                check_in_date=check_in,
                check_out_date=check_out,
                total_price=total_price,
                guest_count=random.randint(1, 3),
                status=BookingStatus.CHECKED_IN,
            )
            booking.rooms.set(room_sample)
            
            # Tạo RoomRental cho checked_in bookings
            rental = RoomRental.objects.create(
                booking=booking,
                customer=customer,
                check_out_date=check_out,
                total_price=total_price,
                guest_count=booking.guest_count,
            )
            rental.rooms.set(room_sample)

    def create_notifications(self):
        """Tạo thông báo cho users"""
        users = UserModel.objects.filter(role__in=['customer', 'staff'])
        notification_templates = [
            ('booking_confirmation', 'Xác nhận đặt phòng', 'Đặt phòng của bạn đã được xác nhận thành công.'),
            ('check_in_reminder', 'Nhắc nhở nhận phòng', 'Đừng quên nhận phòng vào ngày mai.'),
            ('check_out_reminder', 'Nhắc nhở trả phòng', 'Hôm nay là ngày trả phòng của bạn.'),
            ('promotion', 'Khuyến mãi đặc biệt', 'Giảm 20% cho đặt phòng cuối tuần!'),
            ('promotion', 'Ưu đãi VIP', 'Chúc mừng! Bạn đã trở thành khách VIP.'),
        ]
        
        for user in users:
            # Tạo 2-5 notification cho mỗi user
            num_notifications = random.randint(2, 5)
            for _ in range(num_notifications):
                notification_type, title, message = random.choice(notification_templates)
                
                created_at = timezone.now() - timedelta(
                    days=random.randint(0, 30),
                    hours=random.randint(0, 23)
                )
                
                is_read = random.choice([True, False])
                read_at = None
                if is_read:
                    read_at = created_at + timedelta(hours=random.randint(1, 48))
                
                Notification.objects.create(
                    user=user,
                    notification_type=notification_type,
                    title=title,
                    message=message + f' {fake.text(max_nb_chars=50)}',
                    created_at=created_at,
                    is_read=is_read,
                    read_at=read_at,
                )
