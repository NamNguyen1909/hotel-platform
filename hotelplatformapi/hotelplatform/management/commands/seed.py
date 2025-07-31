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
        self.update_customer_stats()  # Cập nhật thống kê khách hàng sau khi seed xong
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
                # Không set thủ công total_bookings và customer_type
                # Để signals tự động cập nhật khi tạo booking/payment

    def create_room_types(self):
        types = [
            ('Phòng đơn', 'Phòng tiêu chuẩn cho 1 người với đầy đủ tiện nghi cơ bản', 500000, 1),
            ('Phòng đôi', 'Phòng rộng rãi cho 2 người với 1 giường đôi', 800000, 2),
            ('Phòng gia đình', 'Phòng lớn phù hợp cho gia đình nhỏ', 1200000, 4),
            ('Phòng VIP', 'Phòng cao cấp với view đẹp và dịch vụ đặc biệt', 2000000, 4),
            ('Suite', 'Phòng hạng sang với phòng khách riêng biệt', 3500000, 6),
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
                        'status': 'available',  # Tất cả phòng bắt đầu với trạng thái available
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
                
                # Tính giá dựa trên số ngày thực tế và giá phòng
                stay_days = (check_out.date() - check_in.date()).days
                if stay_days < 1:
                    stay_days = 1
                
                total_price = Decimal('0')
                for room in room_sample:
                    total_price += room.room_type.base_price * stay_days
                
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
        """Tạo booking hiện tại và tương lai - để signals tự động cập nhật trạng thái phòng"""
        customers = list(UserModel.objects.filter(role='customer'))
        available_rooms = list(Room.objects.filter(status='available'))
        
        # Tính toán số lượng booking hợp lý để có đa dạng trạng thái:
        # - Khoảng 10-15% phòng sẽ có booking pending/confirmed (status = booked)
        # - Khoảng 5-10% phòng sẽ có booking checked_in (status = occupied)  
        # - Còn lại 75-85% phòng sẽ giữ trạng thái available
        
        total_rooms = len(available_rooms)
        
        # Booking trong tương lai (pending, confirmed) - 10-15% tổng số phòng
        future_bookings_count = int(total_rooms * 0.10) + random.randint(0, int(total_rooms * 0.05))
        
        for i in range(min(future_bookings_count, len(available_rooms))):
            if len(available_rooms) < 1:
                break
                
            customer = random.choice(customers)
            check_in = timezone.now() + timedelta(days=random.randint(1, 27))
            check_out = check_in + timedelta(days=random.randint(1, 5))
            
            # Chỉ lấy 1 phòng để tối ưu số lượng
            room_sample = [random.choice(available_rooms)]
            
            # Tính giá dựa trên số ngày và giá phòng thực tế
            stay_days = (check_out.date() - check_in.date()).days
            if stay_days < 1:
                stay_days = 1
            
            total_price = Decimal('0')
            for room in room_sample:
                total_price += room.room_type.base_price * stay_days
            
            booking_status = random.choice([BookingStatus.PENDING, BookingStatus.CONFIRMED])
            booking = Booking.objects.create(
                customer=customer,
                check_in_date=check_in,
                check_out_date=check_out,
                total_price=total_price,
                guest_count=random.randint(1, 3),
                status=booking_status,
                special_requests=fake.text(max_nb_chars=50) if random.choice([True, False]) else None,
            )
            booking.rooms.set(room_sample)
            
            # Loại bỏ các phòng đã được đặt khỏi danh sách available
            # (Signals sẽ tự động cập nhật trạng thái phòng thành 'booked')
            for room in room_sample:
                if room in available_rooms:
                    available_rooms.remove(room)
        
        # Booking hiện tại (checked_in) - 5-10% tổng số phòng
        current_bookings_count = int(total_rooms * 0.05) + random.randint(0, int(total_rooms * 0.05))
        
        for i in range(min(current_bookings_count, len(available_rooms))):
            if not available_rooms:
                break
                
            customer = random.choice(customers)
            check_in = timezone.now() - timedelta(days=random.randint(0, 3))
            check_out = timezone.now() + timedelta(days=random.randint(1, 4))
            
            # Chỉ lấy 1 phòng để tối ưu số lượng
            room_sample = [random.choice(available_rooms)]
            
            # Loại bỏ khỏi danh sách available
            for room in room_sample:
                available_rooms.remove(room)
            
            # Tính giá dựa trên số ngày và giá phòng thực tế
            stay_days = (check_out.date() - check_in.date()).days
            if stay_days < 1:
                stay_days = 1
            
            total_price = Decimal('0')
            for room in room_sample:
                total_price += room.room_type.base_price * stay_days
            
            booking = Booking.objects.create(
                customer=customer,
                check_in_date=check_in,
                check_out_date=check_out,
                total_price=total_price,
                guest_count=random.randint(1, 3),
                status=BookingStatus.CHECKED_IN,
            )
            booking.rooms.set(room_sample)
            # Signals sẽ tự động cập nhật trạng thái phòng thành 'occupied'
            
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

    def update_customer_stats(self):
        """Cập nhật thống kê cho tất cả customer sau khi seed xong"""
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