from datetime import datetime, timedelta
import hashlib
import hmac
from django.shortcuts import redirect, render
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
import urllib

# REST Framework imports
from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework.filters import SearchFilter, OrderingFilter
# from django_filters.rest_framework import DjangoFilterBackend



# Django imports
from django.utils import timezone
from django.db import transaction
from django.db.models import Q, Sum, Count, Avg, F
from django.db.models.functions import TruncMonth
from django.shortcuts import get_object_or_404

# Local imports
from .models import (
    User, RoomType, Room, RoomImage, Booking, RoomRental, Payment, DiscountCode, Notification,
    BookingStatus, CustomerType
)
from .serializers import (
    UserSerializer, UserDetailSerializer, UserListSerializer, RoomTypeSerializer, RoomSerializer, RoomDetailSerializer,
    BookingSerializer, BookingDetailSerializer, RoomRentalSerializer, RoomRentalDetailSerializer,
    PaymentSerializer, DiscountCodeSerializer, NotificationSerializer, RoomImageSerializer
)
from .permissions import (
    IsAdminUser, IsOwnerUser, IsStaffUser, IsCustomerUser, IsAdminOrOwner, IsAdminOrOwnerOrStaff,
    IsBookingOwner, IsRoomRentalOwner, IsPaymentOwner, IsNotificationOwner, CanManageRooms,
    CanManageBookings, CanManagePayments, CanCreateDiscountCode, CanViewStats, CanCheckIn,
    CanCheckOut, CanConfirmBooking, CanGenerateQRCode, CanUpdateProfile, CanCancelBooking,
    CanCreateNotification, CanModifyRoomType, CanManageCustomers, CanManageStaff
)

# Create your views here.
def home(request):
    return HttpResponse('Welcome to Hotel Platform API!')


# ================================ VIEWSETS ================================

class UserViewSet(viewsets.ViewSet, generics.RetrieveAPIView):
    """
    ViewSet quản lý User kết hợp với generics
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['username', 'email', 'full_name', 'phone']
    ordering_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action in ['retrieve', 'profile']:
            return UserDetailSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [AllowAny()]
        elif self.action in ['list', 'vip_customers']:
            return [CanManageCustomers()]
        elif self.action in ['create_staff', 'staff_list']:
            return [CanManageStaff()]
        elif self.action in ['customers_list', 'toggle_active']:
            return [CanManageCustomers()]
        elif self.action in ['update', 'partial_update']:
            return [CanUpdateProfile()]
        return [IsAuthenticated()]

    def create(self, request):
        """
        Tạo user mới.
        Nếu chưa đăng nhập, chỉ cho phép tạo tài khoản customer.
        """
        data = request.data.copy()
        if not request.user.is_authenticated:
            data['role'] = 'customer'

        serializer = UserSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        """
        Cập nhật user
        """
        user = get_object_or_404(User, pk=pk)
        self.check_object_permissions(request, user)

        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserDetailSerializer(user).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def create_staff(self, request):
        """
        Owner,admin tạo staff account
        """
        data = request.data.copy()
        data['role'] = 'staff'

        serializer = UserSerializer(data=data)
        if serializer.is_valid():
            staff = serializer.save()
            return Response({
                'message': 'Staff account created successfully',
                'staff': UserSerializer(staff).data
            }, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def staff_list(self, request):
        """
        Owner xem danh sách staff với thông tin đầy đủ
        """
        staff_users = User.objects.filter(role='staff').order_by('-created_at')
        serializer = UserListSerializer(staff_users, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def profile(self, request):
        """
        Lấy thông tin profile của user hiện tại
        """
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['put'])
    def update_profile(self, request):
        """
        Cập nhật profile của user hiện tại
        """
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserDetailSerializer(user).data)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def vip_customers(self, request):
        """
        Phân tích khách hàng VIP
        """
        vip_customers = User.objects.filter(
            role='customer',
            customer_type__in=[CustomerType.VIP, CustomerType.SUPER_VIP]
        ).order_by('-total_spent', '-total_bookings')[:10]

        serializer = UserDetailSerializer(vip_customers, many=True)
        return Response({
            'message': 'Top VIP customers',
            'customers': serializer.data
        })

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """
        Kích hoạt/vô hiệu hóa user (nhân viên hoặc khách hàng) - chỉ dành cho Admin và Owner
        """
        # Kiểm tra quyền
        if not (request.user.role in ['admin', 'owner']):
            return Response(
                {'error': 'Bạn không có quyền thực hiện thao tác này'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            user = get_object_or_404(User, pk=pk)
            
            # Chỉ cho phép toggle active cho staff và customer
            if user.role not in ['staff', 'customer']:
                return Response(
                    {'error': 'Chỉ có thể thay đổi trạng thái nhân viên hoặc khách hàng'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Không cho phép user tự vô hiệu hóa chính mình
            if user == request.user:
                return Response(
                    {'error': 'Không thể thay đổi trạng thái của chính mình'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Toggle active status
            user.is_active = not user.is_active
            user.save()
            
            action_text = 'kích hoạt' if user.is_active else 'vô hiệu hóa'
            user_type = 'nhân viên' if user.role == 'staff' else 'khách hàng'
            
            return Response({
                'message': f'Đã {action_text} {user_type} {user.full_name or user.username} thành công',
                'user': UserSerializer(user).data,
                'is_active': user.is_active
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Lỗi khi thay đổi trạng thái: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def customers_list(self, request):
        """
        Admin/Owner/staff xem danh sách customers với thống kê
        """
        customer_users = User.objects.filter(role='customer').order_by('-created_at')
        serializer = UserListSerializer(customer_users, many=True)
        return Response(serializer.data)

class RoomTypeViewSet(viewsets.ViewSet, generics.ListAPIView, generics.RetrieveAPIView,generics.DestroyAPIView):
    """
    ViewSet quản lý RoomType
    """
    queryset = RoomType.objects.all()
    serializer_class = RoomTypeSerializer
    permission_classes = [IsAuthenticated]  # Mặc định yêu cầu authentication
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['base_price', 'max_guests', 'created_at']
    ordering = ['base_price']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]  # Chỉ cho phép guest xem danh sách và chi tiết
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [CanModifyRoomType()]
        return [IsAuthenticated()]  # Các action khác cần authentication

    def create(self, request):
        """
        Tạo room type mới (chỉ admin/owner)
        """
        serializer = RoomTypeSerializer(data=request.data)
        if serializer.is_valid():
            room_type = serializer.save()
            return Response(
                RoomTypeSerializer(room_type).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        """
        Cập nhật room type
        """
        room_type = get_object_or_404(RoomType, pk=pk)
        serializer = RoomTypeSerializer(room_type, data=request.data, partial=True)
        if serializer.is_valid():
            room_type = serializer.save()
            return Response(RoomTypeSerializer(room_type).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RoomViewSet(viewsets.ViewSet, generics.ListAPIView, generics.RetrieveAPIView,generics.DestroyAPIView):
    """
    ViewSet quản lý Room
    """
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]  # Mặc định yêu cầu authentication
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['room_number', 'room_type__name']
    ordering_fields = ['room_number', 'status', 'created_at']
    ordering = ['room_number']
    # filterset_fields = ['status', 'room_type']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return RoomDetailSerializer
        return RoomSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'available']:
            return [AllowAny()]  # Chỉ cho phép guest xem danh sách, chi tiết và phòng trống
        elif self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [CanManageRooms()]
        elif self.action == 'low_performance':
            return [CanViewStats()]
        return [IsAuthenticated()]  # Các action khác cần authentication

    def get_queryset(self):
        queryset = Room.objects.select_related('room_type').all()

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        room_type = self.request.query_params.get('room_type')
        if room_type:
            queryset = queryset.filter(room_type__id=room_type)

        return queryset

    def create(self, request):
        """
        Tạo room mới (chỉ admin/owner)
        """
        serializer = RoomSerializer(data=request.data)
        if serializer.is_valid():
            room = serializer.save()
            return Response(
                RoomSerializer(room).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        """
        Cập nhật room
        """
        room = get_object_or_404(Room, pk=pk)
        serializer = RoomSerializer(room, data=request.data, partial=True)
        if serializer.is_valid():
            room = serializer.save()
            return Response(RoomDetailSerializer(room).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def available(self, request):
        """
        Lấy danh sách phòng còn trống
        """
        check_in = request.query_params.get('check_in')
        check_out = request.query_params.get('check_out')
        room_type = request.query_params.get('room_type')
        guest_count = request.query_params.get('guest_count')

        if not check_in or not check_out:
            return Response(
                {"error": "Cần cung cấp check_in và check_out"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            check_in_date = datetime.strptime(check_in, '%Y-%m-%d')
            check_out_date = datetime.strptime(check_out, '%Y-%m-%d')
            if check_in_date >= check_out_date:
                return Response(
                    {"error": "Ngày nhận phòng phải trước ngày trả phòng"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except ValueError:
            return Response(
                {"error": "Định dạng ngày không hợp lệ, sử dụng YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST
            )

        booked_rooms = Booking.objects.filter(
            status__in=['pending', 'confirmed', 'checked_in'],
            check_in_date__lt=check_out_date,
            check_out_date__gt=check_in_date
        ).values_list('rooms__id', flat=True)

        available_rooms = Room.objects.filter(status='available').exclude(id__in=booked_rooms)

        if room_type:
            available_rooms = available_rooms.filter(room_type__id=room_type)

        if guest_count:
            try:
                guest_count = int(guest_count)
                available_rooms = available_rooms.filter(room_type__max_guests__gte=guest_count)
            except ValueError:
                return Response(
                    {"error": "Số lượng khách phải là số nguyên"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = RoomSerializer(available_rooms, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def low_performance(self, request):
        """
        Phân tích phòng ít được thuê
        """
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d') if start_date else timezone.now() - timedelta(days=365)
            end_date = datetime.strptime(end_date, '%Y-%m-%d') if end_date else timezone.now()
        except ValueError:
            return Response(
                {"error": "Định dạng ngày không hợp lệ, sử dụng YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST
            )

        room_usage = Room.objects.annotate(
            booking_count=Count('bookings', filter=Q(
                bookings__check_in_date__gte=start_date,
                bookings__check_out_date__lte=end_date
            ))
        ).order_by('booking_count')[:10]

        serializer = RoomDetailSerializer(room_usage, many=True)
        return Response({
            'message': 'Phòng có hiệu suất thấp',
            'rooms': serializer.data
        })


class BookingViewSet(viewsets.ViewSet, generics.ListAPIView, generics.RetrieveAPIView):
    """
    ViewSet quản lý Booking
    """
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['customer__full_name', 'customer__phone', 'id']
    ordering_fields = ['check_in_date', 'check_out_date', 'created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return BookingDetailSerializer
        return BookingSerializer

    def get_queryset(self):
        queryset = Booking.objects.select_related('customer').prefetch_related('rooms').all()
        
        # Filter by user role
        if self.request.user.is_authenticated and self.request.user.role == 'customer':
            queryset = queryset.filter(customer=self.request.user)
        
        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset

    def create(self, request):
        """Tạo booking mới"""
        serializer = BookingSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            booking = serializer.save()
            booking.generate_qr_code()
            return Response(BookingDetailSerializer(booking).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        """Cập nhật booking"""
        booking = get_object_or_404(Booking, pk=pk)
        self.check_object_permissions(request, booking)
        
        serializer = BookingSerializer(booking, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            booking = serializer.save()
            return Response(BookingDetailSerializer(booking).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get_permissions(self):
        if self.action in ['create']:
            return [CanManageBookings() | IsCustomerUser()]
        elif self.action in ['update', 'partial_update']:
            return [IsBookingOwner() | CanManageBookings()]
        elif self.action in ['confirm', 'check_in']:
            return [CanConfirmBooking()]
        elif self.action in ['cancel']:
            return [CanCancelBooking()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Xác nhận booking (chỉ staff)"""
        booking = get_object_or_404(Booking, pk=pk)
        
        if booking.status != BookingStatus.PENDING:
            return Response({"error": "Booking không ở trạng thái chờ xác nhận"}, status=status.HTTP_400_BAD_REQUEST)
        
        booking.status = BookingStatus.CONFIRMED
        booking.save()
        
        # Tự động tạo QR code thông qua signals
        
        return Response(BookingDetailSerializer(booking).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Hủy booking"""
        booking = get_object_or_404(Booking, pk=pk)
        
        if booking.status in [BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT]:
            return Response({"error": "Không thể hủy booking đã check-in hoặc check-out"}, status=status.HTTP_400_BAD_REQUEST)
        
        booking.status = BookingStatus.CANCELLED
        booking.save()
        
        # Giải phóng phòng
        for room in booking.rooms.all():
            room.status = 'available'
            room.save()
        
        return Response(BookingDetailSerializer(booking).data)


class RoomRentalViewSet(viewsets.ViewSet, generics.ListAPIView, generics.RetrieveAPIView):
    """
    ViewSet quản lý RoomRental
    """
    queryset = RoomRental.objects.all()
    serializer_class = RoomRentalSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['customer__full_name', 'customer__phone']
    ordering_fields = ['check_in_date', 'check_out_date', 'created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return RoomRentalDetailSerializer
        return RoomRentalSerializer

    def get_queryset(self):
        queryset = RoomRental.objects.select_related('customer', 'booking').prefetch_related('rooms').all()
        
        # Filter by user role
        if self.request.user.is_authenticated and self.request.user.role == 'customer':
            queryset = queryset.filter(customer=self.request.user)
        
        return queryset

    def create(self, request):
        """Tạo rental mới"""
        serializer = RoomRentalSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            rental = serializer.save()
            return Response(RoomRentalDetailSerializer(rental).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        """Cập nhật rental"""
        rental = get_object_or_404(RoomRental, pk=pk)
        
        serializer = RoomRentalSerializer(rental, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            rental = serializer.save()
            return Response(RoomRentalDetailSerializer(rental).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get_permissions(self):
        if self.action in ['create']:
            return [IsAuthenticated()]
        elif self.action in ['update', 'partial_update']:
            return [IsRoomRentalOwner()]
        elif self.action in ['checkout']:
            return [CanCheckOut()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def checkout(self, request, pk=None):
        """Check-out và tính toán giá cuối cùng"""
        rental = get_object_or_404(RoomRental, pk=pk)
        
        try:
            with transaction.atomic():
                # Tính toán giá cuối cùng
                rental.check_out_date = timezone.now()
                rental.save()
                
                # Cập nhật booking status
                if rental.booking:
                    rental.booking.status = BookingStatus.CHECKED_OUT
                    rental.booking.save()
                
                # Giải phóng phòng
                for room in rental.rooms.all():
                    room.status = 'available'
                    room.save()
                
                return Response(RoomRentalDetailSerializer(rental).data)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PaymentViewSet(viewsets.ViewSet, generics.ListAPIView, generics.RetrieveAPIView):
    """
    ViewSet quản lý Payment
    """
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['transaction_id', 'rental__customer__full_name']
    ordering_fields = ['paid_at', 'amount', 'created_at']
    ordering = ['-created_at']

    def get_permissions(self):
        if self.action in ['create']:
            return [CanManagePayments()]
        elif self.action in ['process']:
            return [CanManagePayments()]
        return [IsAuthenticated()]

    def create(self, request):
        """Tạo payment mới"""
        serializer = PaymentSerializer(data=request.data)
        if serializer.is_valid():
            payment = serializer.save()
            return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """Xử lý thanh toán"""
        payment = get_object_or_404(Payment, pk=pk)
        
        if payment.status:
            return Response({"error": "Payment đã được thanh toán"}, status=status.HTTP_400_BAD_REQUEST)
        
        payment.status = True
        payment.save()
        
        return Response(PaymentSerializer(payment).data)


class DiscountCodeViewSet(viewsets.ViewSet, generics.ListAPIView, generics.RetrieveAPIView):
    """
    ViewSet quản lý DiscountCode
    """
    queryset = DiscountCode.objects.all()
    serializer_class = DiscountCodeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['code']
    ordering_fields = ['valid_from', 'valid_to', 'discount_percentage']
    ordering = ['-valid_from']

    def get_queryset(self):
        queryset = DiscountCode.objects.all()
        
        # Filter active codes
        active_only = self.request.query_params.get('active_only', None)
        if active_only:
            queryset = queryset.filter(is_active=True)
        
        return queryset

    def create(self, request):
        """Tạo discount code mới (chỉ admin/owner)"""
        serializer = DiscountCodeSerializer(data=request.data)
        if serializer.is_valid():
            discount = serializer.save()
            return Response(DiscountCodeSerializer(discount).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [CanCreateDiscountCode()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['post'])
    def validate_code(self, request):
        """Kiểm tra mã giảm giá có hợp lệ không"""
        code = request.data.get('code')
        if not code:
            return Response({"error": "Cần cung cấp mã giảm giá"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            discount = DiscountCode.objects.get(code=code)
            if discount.is_valid():
                return Response({"valid": True, "discount": DiscountCodeSerializer(discount).data})
            else:
                return Response({"valid": False, "error": "Mã giảm giá không hợp lệ hoặc đã hết hạn"})
        except DiscountCode.DoesNotExist:
            return Response({"valid": False, "error": "Mã giảm giá không tồn tại"})


class NotificationViewSet(viewsets.ViewSet, generics.ListAPIView, generics.RetrieveAPIView):
    """
    ViewSet quản lý Notification
    """
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['title', 'message']
    ordering_fields = ['created_at', 'is_read']
    ordering = ['-created_at']

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)

    def create(self, request):
        """Tạo notification mới (chỉ admin/owner)"""
        serializer = NotificationSerializer(data=request.data)
        if serializer.is_valid():
            notification = serializer.save()
            return Response(NotificationSerializer(notification).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get_permissions(self):
        if self.action in ['create']:
            return [CanCreateNotification()]
        elif self.action in ['mark_as_read', 'mark_all_as_read']:
            return [IsAuthenticated()]
        return [IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Đánh dấu thông báo đã đọc"""
        notification = get_object_or_404(Notification, pk=pk, user=request.user)
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """Đánh dấu tất cả thông báo đã đọc"""
        Notification.objects.filter(user=request.user, is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        
        return Response({"message": "Đã đánh dấu tất cả thông báo đã đọc"})


# ================================ QR CODE & CHECK-IN ================================

class QRCodeScanView(APIView):
    """
    API để scan QR code và thực hiện check-in
    """
    permission_classes = [CanCheckIn]

    def post(self, request):
        """
        Scan QR code và tạo RoomRental
        
        Workflow:
        1. Scan QR code → lấy uuid
        2. Tìm booking theo uuid
        3. Validate booking (confirmed, chưa check-in)
        4. Tạo RoomRental với thông tin thực tế
        5. Cập nhật booking status
        """
        uuid_str = request.data.get('uuid')
        actual_guest_count = request.data.get('actual_guest_count')
        
        if not uuid_str:
            return Response({"error": "Cần cung cấp UUID từ QR code"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Tìm booking theo UUID
            booking = Booking.objects.get(uuid=uuid_str)
            
            # Validate booking
            if booking.status != BookingStatus.CONFIRMED:
                return Response({"error": "Booking chưa được xác nhận hoặc đã check-in"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Validate thời gian check-in
            now = timezone.now()
            if now < booking.check_in_date:
                return Response({"error": "Chưa đến thời gian check-in"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Tạo RoomRental
            with transaction.atomic():
                rental = RoomRental.objects.create(
                    booking=booking,
                    customer=booking.customer,
                    check_out_date=booking.check_out_date,
                    total_price=booking.total_price,
                    guest_count=actual_guest_count or booking.guest_count,
                )
                
                # Thêm rooms vào rental
                rental.rooms.set(booking.rooms.all())
                
                # Cập nhật booking status
                booking.status = BookingStatus.CHECKED_IN
                booking.save()
                
                # Cập nhật room status
                for room in booking.rooms.all():
                    room.status = 'occupied'
                    room.save()
                
                return Response({
                    "message": "Check-in thành công",
                    "rental": RoomRentalDetailSerializer(rental).data,
                    "booking": BookingDetailSerializer(booking).data
                })
        
        except Booking.DoesNotExist:
            return Response({"error": "Không tìm thấy booking với UUID này"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class QRCodeGenerateView(APIView):
    """
    API để tạo QR code cho booking (chỉ admin/staff)
    """
    permission_classes = [CanGenerateQRCode]

    def post(self, request):
        """
        Tạo QR code cho booking
        """
        booking_id = request.data.get('booking_id')
        if not booking_id:
            return Response({"error": "Cần cung cấp booking_id"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            booking = Booking.objects.get(id=booking_id)
            
            if booking.status != BookingStatus.CONFIRMED:
                return Response({"error": "Booking chưa được xác nhận"}, status=status.HTTP_400_BAD_REQUEST)
            
            # Generate QR code (sẽ được xử lý bởi method trong model)
            qr_code_url = booking.generate_qr_code()
            
            return Response({
                "message": "QR code đã được tạo",
                "qr_code_url": qr_code_url,
                "booking": BookingDetailSerializer(booking).data
            })
        
        except Booking.DoesNotExist:
            return Response({"error": "Không tìm thấy booking"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


# ================================ STATS & ANALYTICS ================================

class StatsView(APIView):
    """
    API thống kê dành cho admin
    """
    permission_classes = [CanViewStats]

    def get(self, request):
        """
        Lấy thống kê tổng quan
        """
        # Lấy tham số từ query string
        year = request.GET.get('year', timezone.now().year)
        month = request.GET.get('month', timezone.now().month)
        
        try:
            year = int(year)
            month = int(month)
        except (ValueError, TypeError):
            year = timezone.now().year
            month = timezone.now().month
        
        # Thống kê cơ bản
        total_users = User.objects.filter(role='customer').count()
        total_rooms = Room.objects.count()
        total_bookings = Booking.objects.filter(
            created_at__year=year, 
            created_at__month=month
        ).count()
        
        # Thống kê doanh thu
        total_revenue = Payment.objects.filter(
            status=True,
            paid_at__year=year,
            paid_at__month=month
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        # Tỷ lệ lấp đầy phòng trong tháng được chọn (dựa trên RoomRental)
        from datetime import date
        from calendar import monthrange
        
        # Tính số ngày trong tháng
        days_in_month = monthrange(year, month)[1]
        
        # Tổng số "phòng-ngày" có thể cho thuê trong tháng
        total_room_days = total_rooms * days_in_month
        
        # Tổng số "phòng-ngày" đã được thuê trong tháng
        occupied_room_days = 0
        rentals_in_month = RoomRental.objects.filter(
            check_in_date__year=year,
            check_in_date__month=month
        ).prefetch_related('rooms')
        
        for rental in rentals_in_month:
            # Tính số ngày thuê trong tháng này
            check_in = rental.check_in_date.date() if rental.check_in_date.date().month == month else date(year, month, 1)
            check_out = rental.check_out_date.date() if rental.check_out_date.date().month == month else date(year, month, days_in_month)
            
            if check_out > check_in:
                rental_days = (check_out - check_in).days
                room_count = rental.rooms.count()
                occupied_room_days += rental_days * room_count
        
        # Tỷ lệ lấp đầy = (phòng-ngày đã thuê / tổng phòng-ngày có thể) * 100
        occupancy_rate = (occupied_room_days / total_room_days * 100) if total_room_days > 0 else 0
        
        # Thống kê doanh thu theo tháng (6 tháng gần nhất)
        monthly_revenue = []
        current_date = timezone.now().replace(day=1)
        for i in range(6):
            month_date = current_date - timedelta(days=30 * i)
            revenue = Payment.objects.filter(
                status=True,
                paid_at__year=month_date.year,
                paid_at__month=month_date.month
            ).aggregate(total=Sum('amount'))['total'] or 0
            
            bookings = Booking.objects.filter(
                created_at__year=month_date.year,
                created_at__month=month_date.month
            ).count()
            
            monthly_revenue.append({
                'month': f'T{month_date.month}',
                'revenue': float(revenue),
                'bookings': bookings
            })
        
        monthly_revenue.reverse()
        
        # Top phòng theo doanh thu
        top_rooms = []
        room_revenues = {}
        rentals = RoomRental.objects.filter(
            created_at__year=year,
            created_at__month=month
        ).select_related('booking')
        
        for rental in rentals:
            for room in rental.rooms.all():
                if room.room_number not in room_revenues:
                    room_revenues[room.room_number] = {'revenue': 0, 'bookings': 0}
                room_revenues[room.room_number]['revenue'] += float(rental.total_price or 0)
                room_revenues[room.room_number]['bookings'] += 1
        
        # Sắp xếp và lấy top 5
        sorted_rooms = sorted(room_revenues.items(), key=lambda x: x[1]['revenue'], reverse=True)[:5]
        top_rooms = [
            {
                'room_number': room_number,
                'revenue': data['revenue'],
                'bookings': data['bookings']
            }
            for room_number, data in sorted_rooms
        ]
        
        # Đặt phòng gần đây
        recent_bookings = Booking.objects.filter(
            created_at__year=year,
            created_at__month=month
        ).select_related('customer').prefetch_related('rooms').order_by('-created_at')[:5]
        
        recent_bookings_data = []
        for booking in recent_bookings:
            room_numbers = ', '.join([room.room_number for room in booking.rooms.all()])
            recent_bookings_data.append({
                'id': booking.id,
                'customer_name': booking.customer.full_name or booking.customer.username,
                'room_number': room_numbers,
                'total_price': float(booking.total_price or 0),
                'created_at': booking.created_at.date().isoformat()
            })
        
        return Response({
            "totalRevenue": float(total_revenue),
            "totalBookings": total_bookings,
            "totalCustomers": total_users,
            "occupancyRate": round(occupancy_rate, 1),
            "monthlyRevenue": monthly_revenue,
            "topRooms": top_rooms,
            "recentBookings": recent_bookings_data,
        })


# ======================================== VNPay ========================================
def vnpay_encode(value):
    # Encode giống VNPay: dùng quote_plus để chuyển space thành '+'
    from urllib.parse import quote_plus
    return quote_plus(str(value), safe='')

@csrf_exempt
def create_payment_url(request):
    import pytz
    tz = pytz.timezone("Asia/Ho_Chi_Minh")

    vnp_TmnCode = 'GUPETCYO'
    vnp_HashSecret = 'E2G0Y153XRTW37LVRKW8DJ1TGEQ9RK6I'
    vnp_Url = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
    vnp_ReturnUrl = 'https://event-management-and-online-booking.onrender.com/vnpay/redirect?from=app'

    #Nhận các thông tin đơn hàng từ request
    amount = request.GET.get("amount", "10000")  # đơn vị VND
    order_type = "other"
    #Tạo mã giao dịch và ngày giờ
    order_id = datetime.now(tz).strftime('%H%M%S')
    create_date = datetime.now(tz).strftime('%Y%m%d%H%M%S')
    ip_address = request.META.get('REMOTE_ADDR')

    #Tạo dữ liệu gửi lên VNPay
    input_data = {
        "vnp_Version": "2.1.0",
        "vnp_Command": "pay",
        "vnp_TmnCode": vnp_TmnCode,
        "vnp_Amount": str(int(float(amount)) * 100),
        "vnp_CurrCode": "VND",
        "vnp_TxnRef": order_id,
        "vnp_OrderInfo": "Thanh toan don hang",
        "vnp_OrderType": order_type,
        "vnp_Locale": "vn",
        "vnp_ReturnUrl": vnp_ReturnUrl,
        "vnp_IpAddr": ip_address,
        "vnp_CreateDate": create_date
    }
    print("Input data before signing:", input_data)
    #Tạo chữ ký (vnp_SecureHash) để đảm bảo dữ liệu không bị giả mạo
    sorted_data = sorted(input_data.items())
    query_string = '&'.join(
        f"{k}={vnpay_encode(v)}"
        for k, v in sorted(input_data.items())
        if v
    )
    # Chỉ lấy các key có giá trị, không lấy vnp_SecureHash
    hash_data = '&'.join(
        f"{k}={vnpay_encode(v)}"
        for k, v in sorted(input_data.items())
        if v and k != "vnp_SecureHash"
    )

    secure_hash = hmac.new(
        bytes(vnp_HashSecret, 'utf-8'),
        bytes(hash_data, 'utf-8'),
        hashlib.sha512
    ).hexdigest()
    # Tạo payment_url đầy đủ để redirect người dùng
    payment_url = f"{vnp_Url}?{query_string}&vnp_SecureHash={secure_hash}"
    #Trả kết quả về frontend
    return JsonResponse({"payment_url": payment_url})

def vnpay_response_message(code):
    mapping = {
        "00": "Giao dịch thành công.",
        "07": "Trừ tiền thành công. Giao dịch bị nghi ngờ (liên quan tới lừa đảo, giao dịch bất thường).",
        "09": "Thẻ/Tài khoản chưa đăng ký InternetBanking.",
        "10": "Xác thực thông tin thẻ/tài khoản không đúng quá 3 lần.",
        "11": "Hết hạn chờ thanh toán. Vui lòng thực hiện lại giao dịch.",
        "12": "Thẻ/Tài khoản bị khóa.",
        "13": "Sai mật khẩu xác thực giao dịch (OTP).",
        "24": "Khách hàng hủy giao dịch.",
        "51": "Tài khoản không đủ số dư.",
        "65": "Tài khoản vượt quá hạn mức giao dịch trong ngày.",
        "75": "Ngân hàng thanh toán đang bảo trì.",
        "79": "Sai mật khẩu thanh toán quá số lần quy định.",
        "99": "Lỗi khác hoặc không xác định.",
    }
    return mapping.get(code, "Lỗi không xác định.")

def vnpay_redirect(request):
    """
    Xử lý callback từ VNPay về sau khi thanh toán.
    Nếu truy cập từ app (from=app), trả về HTML vừa gửi postMessage về FE, vừa hiển thị giao diện đẹp cho user.
    Nếu truy cập từ web, trả về deeplink hoặc giao diện web.
    """
    from_app = request.GET.get('from') == 'app'
    vnp_ResponseCode = request.GET.get('vnp_ResponseCode')
    # ... lấy các tham số khác nếu cần

    if vnp_ResponseCode is None:
        return HttpResponse("Thiếu tham số vnp_ResponseCode.", status=400)

    message = vnpay_response_message(vnp_ResponseCode)

    if from_app:
        # Kết hợp: vừa gửi postMessage về FE, vừa render giao diện đẹp
        return HttpResponse(f"""
            <html>
            <head>
                <meta charset="utf-8"/>
                <style>
                    body {{
                        background: #f5f6fa;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                    }}
                    .result-box {{
                        background: #fff;
                        border-radius: 12px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                        padding: 32px 48px;
                        text-align: center;
                    }}
                    .result-title {{
                        color: #2d8cf0;
                        font-size: 3rem;
                        margin-bottom: 12px;
                    }}
                    .result-message {{
                        color: #333;
                        font-size: 1.7rem;
                    }}
                </style>
                <script>
                // Gửi callback về FE qua postMessage để app luôn nhận được kết quả
                setTimeout(function() {{
                    if (window.ReactNativeWebView) {{
                        window.ReactNativeWebView.postMessage(JSON.stringify({{
                            vnp_ResponseCode: "{vnp_ResponseCode}",
                            message: "{message}"
                        }}));
                    }}
                }}, 500);
                </script>
            </head>
            <body>
                <div class="result-box">
                    <div class="result-title">Kết quả thanh toán</div>
                    <div class="result-message">{message}</div>
                </div>
            </body>
            </html>
        """)
    else:
        # Nếu không phải từ app, trả về deeplink hoặc giao diện web
        deeplink = f"bemmobile://payment-result?vnp_ResponseCode={vnp_ResponseCode}&message={urllib.parse.quote(message)}"
        return redirect(deeplink)


class RoomImageViewSet(viewsets.ViewSet, generics.ListAPIView, generics.RetrieveAPIView, generics.DestroyAPIView):
    """
    ViewSet quản lý RoomImage
    """
    queryset = RoomImage.objects.all()
    serializer_class = RoomImageSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['caption', 'room__room_number']
    ordering_fields = ['created_at', 'is_primary']
    ordering = ['-is_primary', '-created_at']

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'by_room']:
            return [AllowAny()]  # Cho phép guest xem ảnh phòng
        elif self.action in ['create', 'update', 'partial_update', 'destroy', 'set_primary']:
            return [CanManageRooms()]
        return [IsAuthenticated()]

    def get_queryset(self):
        queryset = RoomImage.objects.select_related('room').all()

        # Filter by room
        room_id = self.request.query_params.get('room')
        if room_id:
            queryset = queryset.filter(room__id=room_id)

        # Filter by primary status
        is_primary = self.request.query_params.get('is_primary')
        if is_primary is not None:
            is_primary_bool = is_primary.lower() in ['true', '1']
            queryset = queryset.filter(is_primary=is_primary_bool)

        return queryset

    def create(self, request):
        """
        Tạo room image mới
        """
        serializer = RoomImageSerializer(data=request.data)
        if serializer.is_valid():
            room_image = serializer.save()
            return Response(
                RoomImageSerializer(room_image).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        """
        Cập nhật room image
        """
        room_image = get_object_or_404(RoomImage, pk=pk)
        serializer = RoomImageSerializer(room_image, data=request.data, partial=True)
        if serializer.is_valid():
            room_image = serializer.save()
            return Response(RoomImageSerializer(room_image).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def set_primary(self, request, pk=None):
        """
        Đặt ảnh này làm ảnh chính cho phòng
        """
        room_image = get_object_or_404(RoomImage, pk=pk)
        
        # Bỏ primary cho tất cả ảnh khác của phòng này
        RoomImage.objects.filter(room=room_image.room).update(is_primary=False)
        
        # Đặt ảnh này làm primary
        room_image.is_primary = True
        room_image.save()
        
        return Response({
            'message': f'Đã đặt ảnh "{room_image.caption or "Không có tiêu đề"}" làm ảnh chính',
            'room_image': RoomImageSerializer(room_image).data
        })

    @action(detail=False, methods=['get'])
    def by_room(self, request):
        """
        Lấy tất cả ảnh của một phòng cụ thể
        """
        room_id = request.query_params.get('room_id')
        if not room_id:
            return Response(
                {"error": "Vui lòng cung cấp room_id"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            room = get_object_or_404(Room, pk=room_id)
            room_images = RoomImage.objects.filter(room=room).order_by('-is_primary', '-created_at')
            serializer = RoomImageSerializer(room_images, many=True)
            return Response({
                'room': {
                    'id': room.id,
                    'room_number': room.room_number,
                    'room_type': room.room_type.name
                },
                'images': serializer.data
            })
        except Room.DoesNotExist:
            return Response(
                {"error": "Phòng không tồn tại"},
                status=status.HTTP_404_NOT_FOUND
            )