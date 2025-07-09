import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from faker import Faker
from hotelplatform.models import User, RoomType, Room, Booking, RoomRental, Payment, DiscountCode, Notification, RoomImage
from django.contrib.auth import get_user_model
from decimal import Decimal

fake = Faker('vi_VN')
UserModel = get_user_model()

class Command(BaseCommand):
    help = 'Seed database with dummy data for development'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('Seeding data...'))
        self.create_users()
        self.create_room_types()
        self.create_rooms()
        self.create_discount_codes()
        self.create_bookings_and_rentals()
        self.create_notifications()
        self.stdout.write(self.style.SUCCESS('Done!'))

    def create_users(self):
        # Admin
        if not UserModel.objects.filter(username='admin').exists():
            UserModel.objects.create_superuser(
                username='admin',
                email='admin@example.com',
                password='admin123',
                full_name='Admin User',
                role='admin',
            )
        # Owners
        for i in range(2):
            UserModel.objects.get_or_create(
                username=f'owner{i+1}',
                defaults={
                    'email': f'owner{i+1}@example.com',
                    'full_name': fake.name(),
                    'role': 'owner',
                    'password': 'owner123',
                }
            )
        # Staff
        for i in range(3):
            UserModel.objects.get_or_create(
                username=f'staff{i+1}',
                defaults={
                    'email': f'staff{i+1}@example.com',
                    'full_name': fake.name(),
                    'role': 'staff',
                    'password': 'staff123',
                }
            )
        # Customers
        for i in range(10):
            UserModel.objects.get_or_create(
                username=f'customer{i+1}',
                defaults={
                    'email': f'customer{i+1}@example.com',
                    'full_name': fake.name(),
                    'role': 'customer',
                    'password': 'customer123',
                    'phone': fake.phone_number(),
                    'address': fake.address(),
                }
            )

    def create_room_types(self):
        types = [
            ('Phòng đơn', 'Phòng cho 1 người', 300, 1),
            ('Phòng đôi', 'Phòng cho 2 người', 500, 2),
            ('Phòng VIP', 'Phòng cao cấp', 1200, 4),
        ]
        for name, desc, price, max_guests in types:
            RoomType.objects.get_or_create(
                name=name,
                defaults={
                    'description': desc,
                    'base_price': Decimal(price),
                    'max_guests': max_guests,
                    'extra_guest_surcharge': Decimal('25.00'),
                    'amenities': 'Wifi, Điều hòa, TV',
                }
            )

    def create_rooms(self):
        room_types = list(RoomType.objects.all())
        for i in range(1, 16):
            Room.objects.get_or_create(
                room_number=f'P{i:03}',
                defaults={
                    'room_type': random.choice(room_types),
                    'status': random.choice(['available', 'booked', 'occupied']),
                }
            )

    def create_discount_codes(self):
        for i in range(3):
            DiscountCode.objects.get_or_create(
                code=f'DISCOUNT{i+1}',
                defaults={
                    'discount_percentage': random.choice([5, 10, 15]),
                    'valid_from': timezone.now(),
                    'valid_to': timezone.now() + timezone.timedelta(days=30),
                    'max_uses': 10,
                    'is_active': True,
                }
            )

    def create_bookings_and_rentals(self):
        customers = UserModel.objects.filter(role='customer')
        rooms = list(Room.objects.all())
        for i in range(10):
            customer = random.choice(customers)
            check_in = timezone.now() + timezone.timedelta(days=random.randint(1, 10))
            check_out = check_in + timezone.timedelta(days=random.randint(1, 5))
            room_sample = random.sample(rooms, k=random.randint(1, 2))
            booking = Booking.objects.create(
                customer=customer,
                check_in_date=check_in,
                check_out_date=check_out,
                total_price=sum([r.room_type.base_price for r in room_sample]),
                guest_count=random.randint(1, 4),
                status=random.choice(['pending', 'confirmed', 'checked_in', 'checked_out']),
            )
            booking.rooms.set(room_sample)
            # RoomRental
            if booking.status in ['checked_in', 'checked_out']:
                rental = RoomRental.objects.create(
                    booking=booking,
                    customer=customer,
                    check_out_date=check_out,
                    total_price=booking.total_price,
                    guest_count=booking.guest_count,
                )
                rental.rooms.set(room_sample)
                # Payment
                if booking.status == 'checked_out':
                    Payment.objects.create(
                        rental=rental,
                        customer=customer,
                        amount=rental.total_price,
                        payment_method=random.choice(['stripe', 'vnpay', 'cash']),
                        status=True,
                        transaction_id=f'TXN{i+1}{random.randint(1000,9999)}',
                    )

    def create_notifications(self):
        users = UserModel.objects.all()
        for user in users:
            for i in range(2):
                Notification.objects.get_or_create(
                    user=user,
                    notification_type=random.choice(['booking_confirmation', 'check_in_reminder', 'promotion']),
                    title=fake.sentence(nb_words=6),
                    message=fake.text(max_nb_chars=100),
                )
