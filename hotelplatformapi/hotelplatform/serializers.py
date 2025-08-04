from datetime import timedelta
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer
from rest_framework.exceptions import ValidationError
from .models import (
    User, RoomType, Room, Booking, RoomRental, Payment, DiscountCode, Notification, RoomImage
)
from django.db import transaction
from django.utils import timezone
from django.db.models import F
from decimal import Decimal, ROUND_HALF_UP
from cloudinary.utils import cloudinary_url


# Serializer cho RoomImage
class RoomImageSerializer(ModelSerializer):
    image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = RoomImage
        fields = ['id', 'room', 'image', 'image_url', 'caption', 'is_primary', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_image_url(self, obj):
        """Lấy URL của ảnh từ Cloudinary"""
        if obj.image:
            return obj.image.url
        return None
    
    def validate(self, attrs):
        room = attrs.get('room')
        is_primary = attrs.get('is_primary', False)
        
        if is_primary and room:
            existing_primary = room.images.filter(is_primary=True)
            if self.instance:
                existing_primary = existing_primary.exclude(pk=self.instance.pk)
            
            if existing_primary.exists() and is_primary:
                pass
        
        return attrs


# Serializer cho RoomType
class RoomTypeSerializer(ModelSerializer):
    base_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0'))
    extra_guest_surcharge = serializers.DecimalField(max_digits=5, decimal_places=2, min_value=Decimal('0'))

    class Meta:
        model = RoomType
        fields = ['id', 'name', 'description', 'base_price', 'max_guests', 'extra_guest_surcharge', 'amenities']


# Serializer cho Room
class RoomSerializer(ModelSerializer):
    room_type_name = serializers.ReadOnlyField(source='room_type.name')
    room_type_price = serializers.ReadOnlyField(source='room_type.base_price')
    primary_image_url = serializers.SerializerMethodField()
    
    def get_primary_image_url(self, obj):
        primary_image_obj = obj.images.filter(is_primary=True).first()
        if primary_image_obj and primary_image_obj.image:
            return primary_image_obj.image.url
        first_image_obj = obj.images.first()
        if first_image_obj and first_image_obj.image:
            return first_image_obj.image.url
        return None
    
    class Meta:
        model = Room
        fields = ['id', 'room_number', 'room_type', 'room_type_name', 'room_type_price', 'status', 'primary_image_url', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at', 'primary_image_url']
    
    def validate_status(self, value):
        valid_statuses = [status[0] for status in Room.ROOM_STATUS]
        if value not in valid_statuses:
            raise serializers.ValidationError(f"Trạng thái phòng phải là một trong: {valid_statuses}")
        return value


# Serializer cho Notification
class NotificationSerializer(ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'user', 'notification_type', 'title', 'message', 'is_read', 'read_at', 'created_at']
        read_only_fields = ['id', 'created_at', 'read_at']

    def validate_notification_type(self, value):
        valid_types = [nt[0] for nt in Notification.NOTIFICATION_TYPES]
        if value not in valid_types:
            raise serializers.ValidationError(f"Loại thông báo phải là một trong: {valid_types}")
        return value

    def update(self, instance, validated_data):
        if validated_data.get('is_read') and not instance.read_at:
            instance.read_at = timezone.now()
        return super().update(instance, validated_data)


# Serializer cho DiscountCode
class DiscountCodeSerializer(ModelSerializer):
    class Meta:
        model = DiscountCode
        fields = [
            'id', 'code', 'discount_percentage', 'valid_from', 'valid_to',
            'max_uses', 'used_count', 'is_active'
        ]
        read_only_fields = ['used_count']
    
    def validate(self, attrs):
        valid_from = attrs.get('valid_from')
        valid_to = attrs.get('valid_to')
        if valid_from and valid_to and valid_from > valid_to:
            raise serializers.ValidationError("valid_from phải trước valid_to")
        return attrs


# Serializer cho User
class UserSerializer(ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'full_name', 'phone', 'id_card', 'address', 'role', 'avatar', 'is_staff', 'is_active']
        read_only_fields = ['id', 'is_staff', 'is_active']

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Mật khẩu phải dài ít nhất 8 ký tự.")
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        avatar = validated_data.pop('avatar', None)
        validated_data.pop('is_active', None)
        validated_data.pop('customer_type', None)
        user = User(
            username=validated_data['username'],
            email=validated_data['email'],
            full_name=validated_data.get('full_name'),
            phone=validated_data.get('phone'),
            id_card=validated_data.get('id_card'),
            address=validated_data.get('address'),
            role=validated_data.get('role', 'customer'),
        )
        user.set_password(password)
        if avatar:
            user.avatar = avatar
        user.save()
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
        instance.update_customer_type()
        return instance


# Serializer cho danh sách User với thống kê
class UserListSerializer(ModelSerializer):
    avatar = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'phone', 'id_card', 'address', 'role', 'avatar', 
            'is_staff', 'is_active', 'total_bookings', 'total_spent', 'customer_type', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'is_staff', 'is_active', 'total_bookings', 'total_spent', 'customer_type', 'created_at', 'updated_at'
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['avatar'] = instance.avatar.url if instance.avatar else ''
        return data


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
            'guest_count', 'status', 'special_requests', 'qr_code', 'created_at', 'updated_at', 'uuid', 'discount_code'
        ]
        read_only_fields = ['id', 'customer_name', 'customer_phone', 'customer_email', 'created_at', 'updated_at', 'uuid']
        extra_kwargs = {
            'customer': {'required': False},
            'check_in_date': {'required': False},
            'check_out_date': {'required': False},
            'total_price': {'required': False},
            'guest_count': {'required': False},
            'status': {'required': False},
            'special_requests': {'required': False},
            'rooms': {'required': False},
        }

    total_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('0'), required=False
    )
    guest_count = serializers.IntegerField(min_value=1, required=False)
    discount_code = serializers.CharField(max_length=50, required=False, write_only=True)

    def validate(self, attrs):
        check_in_date = attrs.get('check_in_date')
        check_out_date = attrs.get('check_out_date')
        rooms = attrs.get('rooms', [])
        guest_count = attrs.get('guest_count')
        status = attrs.get('status')
        discount_code = attrs.get('discount_code')
        
        request = self.context.get('request')
        customer = attrs.get('customer')

        if self.instance:
            if self.instance.status not in ['pending', 'confirmed']:
                raise serializers.ValidationError({
                    "status": f"Trạng thái booking hiện tại là '{self.instance.status}', chỉ cho phép cập nhật khi trạng thái là 'pending' hoặc 'confirmed'."
                })
        else:
            if status and status != 'pending':
                raise serializers.ValidationError({
                    "status": "Booking mới phải có trạng thái 'pending'."
                })

        if check_in_date and check_out_date:
            if check_in_date >= check_out_date:
                raise serializers.ValidationError({
                    "check_in_date": "Ngày nhận phòng phải trước ngày trả phòng.",
                    "check_out_date": "Ngày trả phòng phải sau ngày nhận phòng."
                })
            if check_in_date > timezone.now() + timedelta(days=28):
                raise serializers.ValidationError({
                    "check_in_date": "Ngày nhận phòng không được vượt quá 28 ngày kể từ thời điểm đặt."
                })

        if rooms and guest_count:
            for room in rooms:
                if room.status != 'available' and status != 'checked_in':
                    raise serializers.ValidationError({
                        "rooms": f"Phòng {room.room_number} đã được đặt trong khoảng thời gian này."
                    })
                if guest_count > room.room_type.max_guests:
                    raise serializers.ValidationError({
                        "guest_count": f"Phòng {room.room_number} chỉ chứa tối đa {room.room_type.max_guests} khách."
                    })
                    
            if check_in_date and check_out_date:
                for room in rooms:
                    overlapping_bookings = Booking.objects.filter(
                        rooms=room,
                        check_in_date__lt=check_out_date,
                        check_out_date__gt=check_in_date,
                        status__in=['pending', 'confirmed', 'checked_in']
                    )
                    if self.instance:
                        overlapping_bookings = overlapping_bookings.exclude(pk=self.instance.pk)
                    
                    if overlapping_bookings.exists():
                        overlap = overlapping_bookings.first()
                        overlap_start = max(check_in_date, overlap.check_in_date)
                        overlap_end = min(check_out_date, overlap.check_out_date)
                        raise serializers.ValidationError({
                            "rooms": f"Phòng {room.room_number} đã được đặt trong khoảng thời gian từ {overlap_start.date()} đến {overlap_end.date()}."
                        })

        if request:
            user = request.user
            if user.role == 'customer':
                attrs['customer'] = user
            else:
                if not customer:
                    raise serializers.ValidationError({
                        "customer": "Trường customer là bắt buộc đối với admin/owner/staff."
                    })
                attrs['customer'] = customer

        if check_in_date and check_out_date and rooms and guest_count:
            days = (check_out_date - check_in_date).days
            if days <= 0:
                days = 1

            total_price = Decimal('0')
            for room in rooms:
                room_type = room.room_type
                base_price = room_type.base_price
                
                room_price = base_price * days
                
                if guest_count > room_type.max_guests:
                    extra_guests = guest_count - room_type.max_guests
                    surcharge = base_price * (room_type.extra_guest_surcharge / 100) * extra_guests * days
                    room_price += surcharge
                
                total_price += room_price
            
            if discount_code:
                try:
                    discount = DiscountCode.objects.get(code=discount_code)
                    if discount.is_valid():
                        discount_amount = total_price * (discount.discount_percentage / 100)
                        total_price -= discount_amount
                        attrs['discount_applied'] = discount
                    else:
                        raise serializers.ValidationError({
                            "discount_code": "Mã giảm giá không hợp lệ hoặc đã hết hạn."
                        })
                except DiscountCode.DoesNotExist:
                    raise serializers.ValidationError({
                        "discount_code": "Mã giảm giá không tồn tại."
                    })
            
            attrs['total_price'] = total_price.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        return attrs

    def create(self, validated_data):
        discount_code = self.context['request'].data.get('discount_code')
        validated_data.pop('discount_code', None)
        discount_applied = validated_data.pop('discount_applied', None)
        rooms_data = validated_data.pop('rooms', None)
    
        with transaction.atomic():
            booking = Booking.objects.create(**validated_data)
        
            if rooms_data is not None:
                booking.rooms.set(rooms_data)
        
            if discount_applied:
                discount_applied.used_count = F('used_count') + 1
                discount_applied.save(update_fields=["used_count"])
                booking.discount_applied = discount_applied
                booking.save()
        
            return booking

    def update(self, instance, validated_data):
        rooms_data = validated_data.pop('rooms', None)
        request = self.context.get('request')
        discount_code = request.data.get('discount_code') if request else None
        discount_applied = validated_data.get('discount_applied')
        
        fields_affecting_price = ['rooms', 'check_in_date', 'check_out_date', 'guest_count', 'discount_code']
        price_affected = any(field in validated_data for field in fields_affecting_price)
        
        if price_affected:
            check_in_date = validated_data.get('check_in_date', instance.check_in_date)
            check_out_date = validated_data.get('check_out_date', instance.check_out_date)
            rooms = rooms_data if rooms_data is not None else instance.rooms.all()
            guest_count = validated_data.get('guest_count', instance.guest_count)
            
            if check_in_date and check_out_date and rooms and guest_count:
                days = (check_out_date - check_in_date).days
                if days <= 0:
                    days = 1

                total_price = Decimal('0')
                for room in rooms:
                    room_type = room.room_type
                    base_price = room_type.base_price
                    
                    room_price = base_price * days
                    
                    if guest_count > room_type.max_guests:
                        extra_guests = guest_count - room_type.max_guests
                        surcharge = base_price * (room_type.extra_guest_surcharge / 100) * extra_guests * days
                        room_price += surcharge
                    
                    total_price += room_price
                
                if discount_code:
                    try:
                        discount = DiscountCode.objects.get(code=discount_code)
                        if discount.is_valid():
                            discount_amount = total_price * (discount.discount_percentage / 100)
                            total_price -= discount_amount
                            discount_applied = discount
                        else:
                            raise serializers.ValidationError({
                                "discount_code": "Mã giảm giá không hợp lệ hoặc đã hết hạn."
                            })
                    except DiscountCode.DoesNotExist:
                        raise serializers.ValidationError({
                            "discount_code": "Mã giảm giá không tồn tại."
                        })
                
                validated_data['total_price'] = total_price
        
        with transaction.atomic():
            old_discount = instance.discount_applied
            if old_discount != discount_applied:
                if old_discount:
                    old_discount.used_count = F('used_count') - 1
                    old_discount.save(update_fields=["used_count"])
                
                if discount_applied:
                    discount_applied.used_count = F('used_count') + 1
                    discount_applied.save(update_fields=["used_count"])
            
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            if rooms_data is not None:
                instance.rooms.set(rooms_data)
            instance.save()
        return instance


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
            'rooms', 'room_details', 'check_in_date', 'check_out_date', 'actual_check_out_date',
            'total_price', 'guest_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'customer_name', 'customer_phone', 'customer_email', 'booking_id', 'created_at', 'updated_at']

    total_price = serializers.DecimalField(
        max_digits=12, decimal_places=2, min_value=Decimal('0'), required=False
    )
    guest_count = serializers.IntegerField(min_value=1, required=False)

    def validate(self, attrs):
        check_in_date = attrs.get('check_in_date', timezone.now())
        check_out_date = attrs.get('check_out_date')
        actual_check_out_date = attrs.get('actual_check_out_date')
        rooms = attrs.get('rooms', [])
        guest_count = attrs.get('guest_count')

        if check_in_date and check_out_date and check_in_date >= check_out_date:
            raise serializers.ValidationError("Ngày nhận phòng phải trước ngày trả phòng.")
        if actual_check_out_date and actual_check_out_date < check_in_date:
            raise serializers.ValidationError("Ngày trả phòng thực tế phải sau ngày nhận phòng.")

        for room in rooms:
            if guest_count and guest_count > room.room_type.max_guests:
                raise serializers.ValidationError(f"Phòng {room.room_number} chỉ chứa tối đa {room.room_type.max_guests} khách.")

        return attrs

    def update(self, instance, validated_data):
        rooms_data = validated_data.pop('rooms', None)
        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            if rooms_data is not None:
                instance.rooms.set(rooms_data)
            instance.save()
            if validated_data.get('actual_check_out_date'):
                instance.check_out()
        return instance


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
        amount = obj.rental.total_price
        if obj.discount_code and obj.discount_code.is_valid():
            discount = amount * (obj.discount_code.discount_percentage / Decimal('100'))
            amount -= discount
        return str(amount)


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

    def validate(self, attrs):
        check_in_date = attrs.get('check_in_date')
        check_out_date = attrs.get('check_out_date')
        rooms = attrs.get('rooms', [])
        guest_count = attrs.get('guest_count')

        if check_in_date and check_out_date:
            if check_in_date >= check_out_date:
                raise serializers.ValidationError("Ngày nhận phòng phải trước ngày trả phòng.")
            if check_in_date > timezone.now() + timedelta(days=28):
                raise serializers.ValidationError("Ngày nhận phòng không được vượt quá 28 ngày kể từ thời điểm đặt.")

        for room in rooms:
            if room.status != 'available':
                raise serializers.ValidationError(f"Phòng {room.room_number} không khả dụng.")
            if guest_count and guest_count > room.room_type.max_guests:
                raise serializers.ValidationError(f"Phòng {room.room_number} chỉ chứa tối đa {room.room_type.max_guests} khách.")

        return attrs

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

    def validate(self, attrs):
        check_in_date = attrs.get('check_in_date', timezone.now())
        check_out_date = attrs.get('check_out_date')
        rooms = attrs.get('rooms', [])
        guest_count = attrs.get('guest_count')

        if check_in_date and check_out_date and check_in_date >= check_out_date:
            raise serializers.ValidationError("Ngày nhận phòng phải trước ngày trả phòng.")

        for room in rooms:
            if guest_count and guest_count > room.room_type.max_guests:
                raise serializers.ValidationError(f"Phòng {room.room_number} chỉ chứa tối đa {room.room_type.max_guests} khách.")

        return attrs

    def create(self, validated_data):
        customer = self.context['request'].user
        rooms_data = validated_data.pop('rooms', [])
        
        with transaction.atomic():
            rental = RoomRental.objects.create(customer=customer, **validated_data)
            if rooms_data:
                rental.rooms.set(rooms_data)
        return rental

    def update(self, instance, validated_data):
        rooms_data = validated_data.pop('rooms', None)
        
        with transaction.atomic():
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
    images = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()

    def get_current_bookings(self, obj):
        current_bookings = obj.bookings.filter(
            status__in=['pending', 'confirmed', 'checked_in']
        ).select_related('customer').prefetch_related('rooms')
        return BookingSerializer(current_bookings, many=True, context=self.context).data

    def get_current_rentals(self, obj):
        current_rentals = obj.rentals.filter(
            check_out_date__gt=timezone.now()
        ).select_related('customer').prefetch_related('rooms')
        return RoomRentalSerializer(current_rentals, many=True, context=self.context).data

    def get_images(self, obj):
        images = obj.images.all().order_by('-is_primary', '-created_at')
        return RoomImageSerializer(images, many=True, context=self.context).data

    def get_primary_image(self, obj):
        primary_image_obj = obj.images.filter(is_primary=True).first()
        if primary_image_obj:
            return RoomImageSerializer(primary_image_obj, context=self.context).data
        first_image_obj = obj.images.first()
        if first_image_obj:
            return RoomImageSerializer(first_image_obj, context=self.context).data
        return None

    class Meta:
        model = Room
        fields = [
            'id', 'room_number', 'room_type', 'status', 'created_at', 'updated_at',
            'current_bookings', 'current_rentals', 'images', 'primary_image'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'current_bookings', 'current_rentals', 'images', 'primary_image']