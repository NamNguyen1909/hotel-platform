from rest_framework import serializers
from rest_framework.serializers import ModelSerializer
from .models import (
    User, RoomType, Room, Booking, RoomRental, Payment, DiscountCode, Notification
)
from django.db import transaction
from django.utils import timezone
from django.db.models import F
from decimal import Decimal
from cloudinary.utils import cloudinary_url


# Serializer cho RoomType
class RoomTypeSerializer(ModelSerializer):
    class Meta:
        model = RoomType
        fields = ['id', 'name', 'description', 'base_price', 'max_guests', 'extra_guest_surcharge', 'amenities']


# Serializer cho Room
class RoomSerializer(ModelSerializer):
    room_type_name = serializers.ReadOnlyField(source='room_type.name')
    room_type_price = serializers.ReadOnlyField(source='room_type.base_price')
    
    class Meta:
        model = Room
        fields = ['id', 'room_number', 'room_type', 'room_type_name', 'room_type_price', 'status', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


# Serializer cho Notification
class NotificationSerializer(ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'user', 'notification_type', 'title', 'message', 'is_read', 'read_at', 'created_at']
        read_only_fields = ['id', 'created_at']


# Serializer cho DiscountCode
class DiscountCodeSerializer(ModelSerializer):
    class Meta:
        model = DiscountCode
        fields = [
            'id', 'code', 'discount_percentage', 'valid_from', 'valid_to',
            'max_uses', 'used_count', 'is_active'
        ]
        read_only_fields = ['used_count']


# Serializer cho User
class UserSerializer(ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'full_name', 'phone', 'id_card', 'address', 'role', 'avatar', 'is_staff', 'is_active']
        read_only_fields = ['id', 'is_staff', 'is_active']

    def create(self, validated_data):
        password = validated_data.pop('password')
        avatar = validated_data.pop('avatar', None)
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=password,
            full_name=validated_data['full_name'],
            phone=validated_data.get('phone'),
            id_card=validated_data.get('id_card'),
            address=validated_data.get('address'),
            role=validated_data.get('role', 'customer'),
            avatar=avatar
        )
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        avatar = validated_data.pop('avatar', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        
        if avatar is not None:
            instance.avatar = avatar
        
        instance.save()
        return instance


# Serializer cho Booking
class BookingSerializer(ModelSerializer):
    customer_name = serializers.ReadOnlyField(source='customer.full_name')
    customer_phone = serializers.ReadOnlyField(source='customer.phone')
    customer_email = serializers.ReadOnlyField(source='customer.email')
    room_details = RoomSerializer(source='rooms', many=True, read_only=True)
    qr_code = serializers.ReadOnlyField()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.qr_code:
            data['qr_code'] = instance.qr_code.url
        else:
            data['qr_code'] = None
        return data

    class Meta:
        model = Booking
        fields = [
            'id', 'customer', 'customer_name', 'customer_phone', 'customer_email',
            'rooms', 'room_details', 'check_in_date', 'check_out_date', 'total_price',
            'guest_count', 'status', 'special_requests', 'qr_code', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'customer_name', 'customer_phone', 'customer_email', 'created_at', 'updated_at']
        
        # Đảm bảo các trường không bắt buộc khi cập nhật (partial update)
        extra_kwargs = {
            'check_in_date': {'required': False},
            'check_out_date': {'required': False},
            'total_price': {'required': False},
            'guest_count': {'required': False},
            'status': {'required': False},
            'special_requests': {'required': False},
            'rooms': {'required': False},
        }

    # Xử lý total_price dưới dạng DecimalField để đảm bảo validate đúng
    total_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal('0'),
        required=False,
    )
    guest_count = serializers.IntegerField(min_value=1, required=False)

    def create(self, validated_data):
        # Tự động gán customer từ context
        customer = self.context['request'].user
        rooms_data = validated_data.pop('rooms', [])
        
        booking = Booking.objects.create(customer=customer, **validated_data)
        
        # Thêm rooms vào booking
        if rooms_data:
            booking.rooms.set(rooms_data)
        
        return booking


# Serializer cho RoomRental
class RoomRentalSerializer(ModelSerializer):
    customer_name = serializers.ReadOnlyField(source='customer.full_name')
    customer_phone = serializers.ReadOnlyField(source='customer.phone')
    customer_email = serializers.ReadOnlyField(source='customer.email')
    room_details = RoomSerializer(source='rooms', many=True, read_only=True)
    booking_id = serializers.ReadOnlyField(source='booking.id')

    class Meta:
        model = RoomRental
        fields = [
            'id', 'booking', 'booking_id', 'customer', 'customer_name', 'customer_phone', 'customer_email',
            'rooms', 'room_details', 'check_in_date', 'check_out_date', 'total_price',
            'guest_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'customer_name', 'customer_phone', 'customer_email', 'booking_id', 'check_in_date', 'created_at', 'updated_at']

    # Xử lý total_price dưới dạng DecimalField để đảm bảo validate đúng
    total_price = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal('0'),
        required=False,
    )
    guest_count = serializers.IntegerField(min_value=1, required=False)

    def create(self, validated_data):
        # Tự động gán customer từ context
        customer = self.context['request'].user
        rooms_data = validated_data.pop('rooms', [])
        
        rental = RoomRental.objects.create(customer=customer, **validated_data)
        
        # Thêm rooms vào rental
        if rooms_data:
            rental.rooms.set(rooms_data)
        
        return rental


# Serializer cho Payment
class PaymentSerializer(ModelSerializer):
    customer_detail = serializers.SerializerMethodField()
    rental_detail = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = ['id', 'rental', 'rental_detail', 'customer_detail', 'amount', 'payment_method', 'status', 'paid_at', 'transaction_id', 'discount_code']
        read_only_fields = ['id', 'paid_at', 'transaction_id']

    def get_customer_detail(self, obj):
        return {
            'full_name': obj.rental.customer.full_name,
            'email': obj.rental.customer.email,
            'phone': obj.rental.customer.phone,
        }

    def get_rental_detail(self, obj):
        return {
            'id': obj.rental.id,
            'check_in_date': obj.rental.check_in_date,
            'check_out_date': obj.rental.check_out_date,
            'guest_count': obj.rental.guest_count,
        }

    def get_amount(self, obj):
        # Convert Decimal to string for JSON serialization
        return str(obj.amount)


# Serializer chi tiết cho User: Profile
class UserDetailSerializer(ModelSerializer):
    bookings = BookingSerializer(many=True, read_only=True)
    rentals = RoomRentalSerializer(many=True, read_only=True)
    notifications = NotificationSerializer(many=True, read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['avatar'] = instance.avatar.url if instance.avatar else ''
        return data

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'phone', 'id_card', 'address', 'role', 'avatar',
            'is_active', 'created_at', 'updated_at', 'bookings', 'rentals', 'notifications'
        ]
        read_only_fields = [
            'id', 'username', 'email', 'is_active', 'created_at', 'updated_at',
            'bookings', 'rentals', 'notifications'
        ]


# Serializer chi tiết cho Booking
class BookingDetailSerializer(ModelSerializer):
    customer = UserSerializer(read_only=True)
    room_details = RoomSerializer(source='rooms', many=True, read_only=True)
    rentals = RoomRentalSerializer(many=True, read_only=True)
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.qr_code:
            data['qr_code'] = instance.qr_code.url
        else:
            data['qr_code'] = None
        return data

    def create(self, validated_data):
        customer = self.context['request'].user
        rooms_data = validated_data.pop('rooms', [])
        
        booking = Booking.objects.create(customer=customer, **validated_data)
        
        if rooms_data:
            booking.rooms.set(rooms_data)
        
        return booking

    def update(self, instance, validated_data):
        rooms_data = validated_data.pop('rooms', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if rooms_data is not None:
            instance.rooms.set(rooms_data)
        
        instance.save()
        return instance

    class Meta:
        model = Booking
        fields = [
            'id', 'customer', 'rooms', 'room_details', 'check_in_date', 'check_out_date',
            'total_price', 'guest_count', 'status', 'special_requests', 'qr_code',
            'created_at', 'updated_at', 'rentals'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'rentals']


# Serializer chi tiết cho RoomRental
class RoomRentalDetailSerializer(ModelSerializer):
    customer = UserSerializer(read_only=True)
    booking = BookingSerializer(read_only=True)
    room_details = RoomSerializer(source='rooms', many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    def create(self, validated_data):
        customer = self.context['request'].user
        rooms_data = validated_data.pop('rooms', [])
        
        rental = RoomRental.objects.create(customer=customer, **validated_data)
        
        if rooms_data:
            rental.rooms.set(rooms_data)
        
        return rental

    def update(self, instance, validated_data):
        rooms_data = validated_data.pop('rooms', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if rooms_data is not None:
            instance.rooms.set(rooms_data)
        
        instance.save()
        return instance

    class Meta:
        model = RoomRental
        fields = [
            'id', 'booking', 'customer', 'rooms', 'room_details', 'check_in_date', 'check_out_date',
            'total_price', 'guest_count', 'created_at', 'updated_at', 'payments'
        ]
        read_only_fields = ['id', 'check_in_date', 'created_at', 'updated_at', 'payments']


# Serializer cho Room với thông tin chi tiết
class RoomDetailSerializer(ModelSerializer):
    room_type = RoomTypeSerializer(read_only=True)
    current_bookings = serializers.SerializerMethodField()
    current_rentals = serializers.SerializerMethodField()

    def get_current_bookings(self, obj):
        # Lấy các booking hiện tại (chưa check-out)
        current_bookings = obj.bookings.filter(
            status__in=['pending', 'confirmed', 'checked_in']
        )
        return BookingSerializer(current_bookings, many=True, context=self.context).data

    def get_current_rentals(self, obj):
        # Lấy các rental hiện tại (chưa check-out)
        current_rentals = obj.rentals.filter(
            check_out_date__gt=timezone.now()
        )
        return RoomRentalSerializer(current_rentals, many=True, context=self.context).data

    class Meta:
        model = Room
        fields = [
            'id', 'room_number', 'room_type', 'status', 'created_at', 'updated_at',
            'current_bookings', 'current_rentals'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'current_bookings', 'current_rentals']