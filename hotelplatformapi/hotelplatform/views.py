from datetime import datetime, timedelta
import hashlib
import hmac
from django.shortcuts import redirect, render
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
import urllib
import logging

# Thiết lập logger
logger = logging.getLogger(__name__)

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
from django.core.exceptions import ValidationError

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
    CanCheckOut, CanConfirmBooking, CanGenerateQRCode, CanUpdateProfile, CanCancelUpdateBooking,
    CanCreateNotification, CanModifyRoomType, CanManageCustomers, CanManageStaff, CanAccessAllBookings
)
from .paginators import ItemPaginator, UserPaginator, RoomPaginator, RoomTypePaginator

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
    pagination_class = UserPaginator
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
        logger.debug("Request data for user creation: %s", data)  # Log dữ liệu đầu vào
        if not request.user.is_authenticated:
            data['role'] = 'customer'

        serializer = UserSerializer(data=data)
        if serializer.is_valid():
            user = serializer.save()
            logger.debug("Created user with password: %s", user.password)  # Log mật khẩu đã băm
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

        logger.error("Serializer errors: %s", serializer.errors)  # Log lỗi nếu có
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
        Owner xem danh sách staff với thông tin đầy đủ và phân trang
        """
        staff_users = User.objects.filter(role='staff').order_by('-created_at')
        
        search = request.query_params.get('search', None)
        if search:
            staff_users = staff_users.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(full_name__icontains=search) |
                Q(phone__icontains=search)
            )
        
        paginator = UserPaginator()
        page = paginator.paginate_queryset(staff_users, request)
        if page is not None:
            serializer = UserListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
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
        if not (request.user.role in ['admin', 'owner']):
            return Response(
                {'error': 'Bạn không có quyền thực hiện thao tác này'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            user = get_object_or_404(User, pk=pk)
            
            if user.role not in ['staff', 'customer']:
                return Response(
                    {'error': 'Chỉ có thể thay đổi trạng thái nhân viên hoặc khách hàng'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if user == request.user:
                return Response(
                    {'error': 'Không thể thay đổi trạng thái của chính mình'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
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
        Admin/Owner/staff xem danh sách customers với thống kê và phân trang
        """
        customer_users = User.objects.filter(role='customer').order_by('-created_at')
        
        search = request.query_params.get('search', None)
        if search:
            customer_users = customer_users.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(full_name__icontains=search) |
                Q(phone__icontains=search)
            )
        
        customer_type = request.query_params.get('customer_type', None)
        if customer_type:
            customer_users = customer_users.filter(customer_type=customer_type)
        
        paginator = UserPaginator()
        page = paginator.paginate_queryset(customer_users, request)
        if page is not None:
            serializer = UserListSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = UserListSerializer(customer_users, many=True)
        return Response(serializer.data)

class RoomTypeViewSet(viewsets.ViewSet, generics.ListAPIView, generics.RetrieveAPIView,generics.DestroyAPIView):
    """
    ViewSet quản lý RoomType
    """
    queryset = RoomType.objects.all()
    serializer_class = RoomTypeSerializer
    permission_classes = [IsAuthenticated]  # Mặc định yêu cầu authentication
    pagination_class = RoomTypePaginator
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
    pagination_class = RoomPaginator
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

        #  AVAILABLE ROOMS LOGIC - Enhanced for booking conflicts
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

        #  BOOKING CONFLICT DETECTION LOGIC
        # Tìm các phòng đã được đặt trong khoảng thời gian yêu cầu
        # Logic: Hai khoảng thời gian overlap nếu:
        # - Ngày bắt đầu của booking mới < ngày kết thúc của booking hiện tại
        # - Ngày kết thúc của booking mới > ngày bắt đầu của booking hiện tại
        booked_rooms = Booking.objects.filter(
            status__in=['pending', 'confirmed', 'checked_in'],  # Chỉ các booking còn active
            check_in_date__lt=check_out_date,  # Booking hiện tại bắt đầu trước khi booking mới kết thúc
            check_out_date__gt=check_in_date   # Booking hiện tại kết thúc sau khi booking mới bắt đầu
        ).values_list('rooms__id', flat=True)

        #  LỌC PHÒNG AVAILABLE
        # Chỉ lấy phòng có status='available' và không bị conflict với booking khác
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
    pagination_class = ItemPaginator
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['customer__full_name', 'customer__phone', 'id', 'rooms__room_number', 'rooms__room_type__name']
    ordering_fields = ['check_in_date', 'check_out_date', 'created_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return BookingDetailSerializer
        return BookingSerializer

    def get_queryset(self):
        from .permissions import has_permission
        queryset = Booking.objects.select_related('customer').prefetch_related('rooms').all()

        # Nếu là customer, chỉ trả về booking của họ
        if self.request.user.is_authenticated and self.request.user.role == 'customer':
            queryset = queryset.filter(customer=self.request.user)

        # Các bộ lọc khác
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        check_in_date = self.request.query_params.get('check_in_date')
        if check_in_date:
            queryset = queryset.filter(check_in_date__date=check_in_date)

        search_query = self.request.query_params.get('search')
        if search_query and search_query.strip():
            queryset = queryset.filter(
                Q(customer__full_name__icontains=search_query) |
                Q(customer__phone__icontains=search_query) |
                Q(rooms__room_number__icontains=search_query) |
                Q(rooms__room_type__name__icontains=search_query)
            ).distinct()

        return queryset

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [CanAccessAllBookings()]
        elif self.action in ['confirm', 'checkin']:
            return [CanConfirmBooking()]
        elif self.action in ['cancel', 'update', 'partial_update']:
            return [CanCancelUpdateBooking()]
        return [IsAuthenticated()]

    def create(self, request):
        """Tạo booking mới với logic tính giá thông minh"""
        serializer = BookingSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            # Lấy kết quả tính giá thông minh nếu có
            smart_pricing = serializer.validated_data.get('_smart_pricing_result')
            if smart_pricing:
                # Log kết quả phân bổ để debug
                logger.info(f"Smart pricing result: {smart_pricing['calculation_details']}")
                logger.info(f"Total calculated price: {smart_pricing['total_price']}")
            
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


    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """Xác nhận booking (PENDING → CONFIRMED) - chỉ staff/admin"""
        booking = get_object_or_404(Booking, pk=pk)
        
        if booking.status != BookingStatus.PENDING:
            return Response(
                {"error": "Booking không ở trạng thái chờ xác nhận"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Kiểm tra phòng còn available không
        unavailable_rooms = []
        for room in booking.rooms.all():
            if room.status not in ['available', 'booked']:
                unavailable_rooms.append(room.room_number)
        
        if unavailable_rooms:
            return Response(
                {"error": f"Phòng {', '.join(unavailable_rooms)} không còn khả dụng"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cập nhật trạng thái
        booking.status = BookingStatus.CONFIRMED
        booking.save()
        
        return Response({
            "message": "Booking đã được xác nhận thành công",
            "booking": BookingDetailSerializer(booking).data
        })

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Hủy booking"""
        booking = get_object_or_404(Booking, pk=pk)
        
        if booking.status in [BookingStatus.CHECKED_IN, BookingStatus.CHECKED_OUT]:
            return Response({"error": "Không thể hủy booking đã check-in hoặc check-out"}, status=status.HTTP_400_BAD_REQUEST)
        
        booking.status = BookingStatus.CANCELLED
        booking.save()
        
        return Response(BookingDetailSerializer(booking).data)

    @action(detail=True, methods=['post'])
    def checkin(self, request, pk=None):
        """ CHECK-IN LOGIC - Enhanced with comprehensive validation and logging"""
        logger.info(f"=== Starting check-in process for booking {pk} ===")
        logger.info(f"Check-in request for booking {pk} with data: {request.data}")
        logger.info(f"User: {request.user}, Role: {getattr(request.user, 'role', 'No role')}")
        
        #  BOOKING VALIDATION - Ensure booking exists and is in correct state
        try:
            booking = get_object_or_404(Booking, pk=pk)
            logger.info(f"Found booking {pk}: status={booking.status}, customer={booking.customer}")
        except Exception as e:
            logger.error(f"Error getting booking {pk}: {e}")
            return Response({"error": f"Booking not found: {e}"}, status=status.HTTP_404_NOT_FOUND)

        #  STATUS VALIDATION - Only confirmed bookings can be checked in
        if booking.status != BookingStatus.CONFIRMED:
            logger.warning(f"Booking {pk} status is {booking.status}, not CONFIRMED")
            return Response({"error": "Booking chưa được xác nhận hoặc đã check-in"}, status=status.HTTP_400_BAD_REQUEST)

        #  TIME VALIDATION - Enhanced for development flexibility
        now = timezone.now()
        logger.info(f"Current time: {now}, Booking check-in time: {booking.check_in_date}")
        logger.info("Time validation skipped for testing purposes - Enable for production")
        # if now.date() < booking.check_in_date:
        #     return Response({"error": "Chưa đến ngày check-in"}, status=status.HTTP_400_BAD_REQUEST)

        #  ROOM STATUS VALIDATION - Ensure all rooms are available for check-in
        logger.info(f"Checking room statuses for booking {pk}")
        for room in booking.rooms.all():
            logger.info(f"Room {room.room_number} status: {room.status}")
            if room.status not in ['booked', 'available']:
                logger.warning(f"Phòng {room.room_number} có trạng thái không hợp lệ: {room.status}")
                return Response(
                    {"error": f"Phòng {room.room_number} không khả dụng (trạng thái: {room.status})"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # GUEST COUNT VALIDATION - Handle actual vs expected guest count
        actual_guest_count = request.data.get('actual_guest_count')
        logger.info(f"Received actual_guest_count: {actual_guest_count} (type: {type(actual_guest_count)})")
        
        # VALIDATE GUEST COUNT INPUT
        if actual_guest_count is None:
            logger.error("Missing actual_guest_count in request data")
            return Response({"error": "Thiếu thông tin số khách thực tế"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            actual_guest_count = int(actual_guest_count)
            logger.info(f"Converted actual_guest_count to int: {actual_guest_count}")
            if actual_guest_count <= 0:
                logger.error(f"Invalid actual_guest_count: {actual_guest_count} <= 0")
                return Response({"error": "Số khách thực tế phải lớn hơn 0"}, status=status.HTTP_400_BAD_REQUEST)
        except (ValueError, TypeError) as e:
            logger.error(f"Failed to convert actual_guest_count to int: {e}")
            return Response({"error": "Số khách thực tế không hợp lệ"}, status=status.HTTP_400_BAD_REQUEST)

        # CAPACITY VALIDATION - Kiểm tra sức chứa phòng trước khi check-in
        total_max_capacity = sum(room.room_type.max_guests for room in booking.rooms.all())
        max_allowed_guests = int(total_max_capacity * 1.5)  # 150% limit
        
        logger.info(f"Capacity validation check:")
        logger.info(f"  - Total room capacity: {total_max_capacity}")
        logger.info(f"  - 150% limit (max allowed): {max_allowed_guests}")
        logger.info(f"  - Actual guest count: {actual_guest_count}")
        logger.info(f"  - Validation: {actual_guest_count} > {max_allowed_guests} = {actual_guest_count > max_allowed_guests}")
        
        if total_max_capacity > 0 and actual_guest_count > max_allowed_guests:
            error_message = f"Không thể check-in! Số khách thực tế ({actual_guest_count}) vượt quá giới hạn 150% sức chứa phòng (tối đa: {max_allowed_guests} khách cho {total_max_capacity} sức chứa cơ bản)."
            logger.error(f"CAPACITY VALIDATION FAILED: {error_message}")
            return Response({
                "error": error_message,
                "details": {
                    "actual_guests": actual_guest_count,
                    "room_capacity": total_max_capacity,
                    "max_allowed": max_allowed_guests,
                    "exceeded_by": actual_guest_count - max_allowed_guests
                }
            }, status=status.HTTP_400_BAD_REQUEST)

        # Log successful capacity validation
        logger.info(f"✓ Capacity validation passed: {actual_guest_count} guests within limit of {max_allowed_guests}")

        # Note: Guest capacity validation với phụ thu được xử lý trong models.py 
        # - Booking.calculate_actual_price() tính phụ thu tự động
        # - RoomRental.clean() chỉ warning, không chặn (cho phép phụ thu)
        # - Booking.calculate_price_for_multiple_rooms() phân bổ khách thông minh

        # DATABASE TRANSACTION - Atomic operation for data consistency
        logger.info(f"Starting transaction for booking {pk}")
        with transaction.atomic():
            try:
                # Step 1: Update booking status and guest count
                logger.info(f"Step 1: Updating booking status to CHECKED_IN")
                booking.status = BookingStatus.CHECKED_IN
                if actual_guest_count:
                    booking.guest_count = actual_guest_count
                booking.save(update_fields=['status', 'guest_count', 'updated_at'])  # Skip full clean
                
                logger.info(f"Booking {booking.id} updated successfully. Creating RoomRental with guest_count={booking.guest_count}")
                
                # Step 2: Create RoomRental record for occupancy tracking
                logger.info(f"Step 2: Creating RoomRental")
                
                # TÍNH GIÁ THỰC TẾ với số khách actual - sử dụng logic có sẵn trong models
                actual_total_price = booking.calculate_actual_price(actual_guest_count)
                logger.info(f"Calculated actual price: {actual_total_price} (vs original: {booking.total_price})")
                
                room_rental = RoomRental(
                    customer=booking.customer,
                    booking=booking,
                    check_in_date=now,
                    check_out_date=booking.check_out_date,
                    guest_count=booking.guest_count,
                    total_price=actual_total_price  # Sử dụng giá đã tính phụ thu
                )
                room_rental.save(skip_validation=True)  # Skip validation during creation
                logger.info(f"RoomRental {room_rental.id} created successfully")
                
                #  Step 3: Link rooms to rental for M2M relationship
                logger.info(f"Step 3: Setting rooms for RoomRental")
                room_rental.rooms.set(booking.rooms.all())
                logger.info(f"Rooms set for RoomRental {room_rental.id}: {[room.room_number for room in booking.rooms.all()]}")
                
                # HOÀN THÀNH - Trả về response thành công
                logger.info(f"Check-in thành công cho Booking {booking.id}, phòng: {[room.room_number for room in booking.rooms.all()]}")
                return Response({
                    "message": "Check-in đặt trước thành công", 
                    "booking_id": booking.id,
                    "rental_id": room_rental.id,
                    "actual_guest_count": actual_guest_count,
                    "calculated_price": str(actual_total_price),
                    "original_price": str(booking.total_price)
                })
            except ValidationError as e:
                logger.error(f"Lỗi ValidationError khi check-in Booking {booking.id}: {str(e)}")
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"Lỗi Exception khi check-in Booking {booking.id}: {str(e)}")
                return Response({"error": f"Unexpected error: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


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

    @action(detail=False, methods=['post'], permission_classes=[CanManageBookings])
    def create_manual_rental(self, request):
        """Tạo RoomRental thủ công khi khách nhận phòng thực tế"""
        serializer = RoomRentalSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            with transaction.atomic():
                rental = serializer.save(check_in_date=timezone.now())  # Ghi nhận thời gian nhận phòng thực tế
                return Response(RoomRentalDetailSerializer(rental).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def checkout(self, request, pk=None):
        """Check-out khách thực tế tại quầy (chỉ staff)"""
        rental = get_object_or_404(RoomRental, pk=pk)
        try:
            with transaction.atomic():
                # Ghi nhận thời gian trả phòng thực tế
                rental.actual_check_out_date = timezone.now()  # Ví dụ: 21:00 05/08/2025
                rental.save()  # Gọi save() để serializer xử lý logic check-out

                payment = rental.payments.last()  # Lấy payment vừa tạo

                return Response({
                    "message": "Check-out thực tế thành công",
                    "rental": RoomRentalDetailSerializer(rental).data,
                    "total_price": str(rental.total_price),
                    "payment": PaymentSerializer(payment).data if payment else None
                })
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

class QRCodePaymentView(APIView):
    """
    API để quét QR code và xử lý thanh toán hóa đơn
    """
    permission_classes = [IsCustomerUser]

    def post(self, request):
        """
        Quét QR code để thanh toán:
        1. Lấy uuid từ QR code
        2. Tìm booking và RoomRental liên kết
        3. Tạo Payment và xử lý thanh toán
        """
        uuid_str = request.data.get('uuid')
        payment_method = request.data.get('payment_method', 'vnpay')

        if not uuid_str:
            return Response({"error": "Cần cung cấp UUID từ QR code"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            booking = Booking.objects.get(uuid=uuid_str)
            rental = RoomRental.objects.filter(booking=booking).first()
            if not rental:
                return Response({"error": "Không tìm thấy phiếu thuê phòng liên kết"}, status=status.HTTP_400_BAD_REQUEST)

            payment = rental.payments.filter(status=False).first()
            if payment:
                return Response({"error": "Hóa đơn đang chờ thanh toán"}, status=status.HTTP_400_BAD_REQUEST)

            with transaction.atomic():
                payment = Payment.objects.create(
                    rental=rental,
                    customer=rental.customer,
                    amount=rental.total_price,
                    payment_method=payment_method,
                    status=False,
                    transaction_id=f"TRANS-{timezone.now().strftime('%Y%m%d%H%M%S')}"
                )

                if payment_method.lower() == 'vnpay':
                    request.GET = request.GET.copy()
                    request.GET['amount'] = str(rental.total_price)
                    payment_response = create_payment_url(request)
                    payment_url = payment_response.json['payment_url']
                    return Response({
                        "message": "Yêu cầu thanh toán được tạo",
                        "payment": PaymentSerializer(payment).data,
                        "payment_url": payment_url
                    })

                payment.status = True
                payment.paid_at = timezone.now()
                payment.save()

                return Response({
                    "message": "Thanh toán thành công",
                    "payment": PaymentSerializer(payment).data
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
            month = int(month) if month else timezone.now().month
        
        # Tháng trước để so sánh
        if month == 1:
            prev_year = year - 1
            prev_month = 12
        else:
            prev_year = year
            prev_month = month - 1
        
        # Thống kê tháng hiện tại
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
        
        # Thống kê tháng trước để tính trend
        prev_total_bookings = Booking.objects.filter(
            created_at__year=prev_year,
            created_at__month=prev_month
        ).count()
        
        prev_total_revenue = Payment.objects.filter(
            status=True,
            paid_at__year=prev_year,
            paid_at__month=prev_month
        ).aggregate(total=Sum('amount'))['total'] or 0
        
        prev_total_customers = User.objects.filter(
            role='customer',
            created_at__year=prev_year,
            created_at__month=prev_month
        ).count()
        
        # Tính trend percentages
        def calculate_trend(current, previous):
            if previous == 0:
                return 100.0 if current > 0 else 0.0
            return round(((current - previous) / previous) * 100, 1)
        
        revenue_trend = calculate_trend(float(total_revenue), float(prev_total_revenue))
        bookings_trend = calculate_trend(total_bookings, prev_total_bookings)
        customers_trend = calculate_trend(total_users, prev_total_customers)
        
        # Tỷ lệ lấp đầy phòng trong tháng được chọn (dựa trên RoomRental)
        from datetime import date
        from calendar import monthrange
        
        # Tính số ngày trong tháng
        days_in_month = monthrange(year, month)[1]
        prev_days_in_month = monthrange(prev_year, prev_month)[1]
        
        # Tổng số "phòng-ngày" có thể cho thuê trong tháng
        total_room_days = total_rooms * days_in_month
        prev_total_room_days = total_rooms * prev_days_in_month
        
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
        
        # Tỷ lệ lấp đầy tháng trước
        prev_occupied_room_days = 0
        prev_rentals = RoomRental.objects.filter(
            check_in_date__year=prev_year,
            check_in_date__month=prev_month
        ).prefetch_related('rooms')
        
        for rental in prev_rentals:
            check_in = rental.check_in_date.date() if rental.check_in_date.date().month == prev_month else date(prev_year, prev_month, 1)
            check_out = rental.check_out_date.date() if rental.check_out_date.date().month == prev_month else date(prev_year, prev_month, prev_days_in_month)
            
            if check_out > check_in:
                rental_days = (check_out - check_in).days
                room_count = rental.rooms.count()
                prev_occupied_room_days += rental_days * room_count
        
        # Tỷ lệ lấp đầy = (phòng-ngày đã thuê / tổng phòng-ngày có thể) * 100
        occupancy_rate = (occupied_room_days / total_room_days * 100) if total_room_days > 0 else 0
        prev_occupancy_rate = (prev_occupied_room_days / prev_total_room_days * 100) if prev_total_room_days > 0 else 0
        occupancy_trend = calculate_trend(occupancy_rate, prev_occupancy_rate)
        
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
            # Trend data (so với tháng trước)
            "trends": {
                "revenueTrend": revenue_trend,
                "bookingsTrend": bookings_trend,
                "customersTrend": customers_trend,
                "occupancyTrend": occupancy_trend
            }
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
    Xử lý callback từ VNPay sau khi thanh toán.
    """
    from_app = request.GET.get('from') == 'app'
    vnp_ResponseCode = request.GET.get('vnp_ResponseCode')
    vnp_TxnRef = request.GET.get('vnp_TxnRef')

    if vnp_ResponseCode is None:
        return HttpResponse("Thiếu tham số vnp_ResponseCode.", status=400)

    message = vnpay_response_message(vnp_ResponseCode)

    try:
        payment = Payment.objects.get(transaction_id=vnp_TxnRef)
        if vnp_ResponseCode == '00':
            payment.status = True
            payment.paid_at = timezone.now()
            payment.save()
        else:
            payment.status = False
            payment.save()
    except Payment.DoesNotExist:
        pass

    if from_app:
        return HttpResponse(f"""
            <html>
            <head>
                <meta charset="utf-8"/>
                <style>
                    body {{ background: #f5f6fa; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }}
                    .result-box {{ background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); padding: 32px 48px; text-align: center; }}
                    .result-title {{ color: #2d8cf0; font-size: 3rem; margin-bottom: 12px; }}
                    .result-message {{ color: #333; font-size: 1.7rem; }}
                </style>
                <script>
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


# ================================ ROOM STATUS AUTO-UPDATE TASK ================================

class RoomStatusUpdateTaskView(APIView):
    """
     AUTOMATED ROOM STATUS UPDATE TASK
    - API endpoint được gọi bởi external schedulers (cron-job.org, Celery, etc.)
    - Tự động cập nhật trạng thái phòng dựa trên timeline booking
    - Xử lý no-show bookings và giải phóng phòng
    """
    permission_classes = [AllowAny]  #  Allow external systems to call this endpoint

    def post(self, request):
        """
         MAIN AUTOMATION LOGIC - Process room status updates based on booking timeline
        """
        from django.utils import timezone
        
        logger.info("=== Starting room status update task ===")
        now = timezone.now()
        today = now.date()
        
        updated_rooms = []
        errors = []
        
        try:
            #  PHASE 1: Update rooms for bookings that have reached check-in date
            # Tìm các booking đã đến ngày check-in nhưng phòng vẫn available
            pending_bookings = Booking.objects.filter(
                status__in=[BookingStatus.PENDING, BookingStatus.CONFIRMED],
                check_in_date__date__lte=today  # Đến ngày check-in hoặc đã quá
            ).prefetch_related('rooms')
            
            logger.info(f"Found {pending_bookings.count()} bookings ready for room status update")
            
            #  PROCESS EACH BOOKING - Update room status from available to booked
            for booking in pending_bookings:
                logger.info(f"Processing booking {booking.id}, check-in: {booking.check_in_date}")
                
                for room in booking.rooms.all():
                    if room.status == 'available':
                        try:
                            old_status = room.status
                            room.status = 'booked'
                            room.save()
                            
                            updated_rooms.append({
                                'room_number': room.room_number,
                                'booking_id': booking.id,
                                'old_status': old_status,
                                'new_status': 'booked',
                                'check_in_date': booking.check_in_date.isoformat()
                            })
                            
                            logger.info(f"Updated room {room.room_number} from {old_status} to booked for booking {booking.id}")
                            
                        except Exception as e:
                            error_msg = f"Failed to update room {room.room_number} for booking {booking.id}: {str(e)}"
                            errors.append(error_msg)
                            logger.error(error_msg)
                    else:
                        logger.info(f"Room {room.room_number} status is {room.status}, no update needed")
            
            #  PHASE 2: Handle NO-SHOW bookings (quá hạn check-in)
            # Tìm các booking quá hạn check-in và cần giải phóng phòng
            overdue_bookings = Booking.objects.filter(
                status__in=[BookingStatus.PENDING, BookingStatus.CONFIRMED],
                check_in_date__lt=now - timedelta(hours=6)  # Quá 6 tiếng sau thời gian check-in
            ).prefetch_related('rooms')
            
            logger.info(f"Found {overdue_bookings.count()} overdue bookings for no-show processing")
            
            for booking in overdue_bookings:
                logger.info(f"Processing overdue booking {booking.id}, check-in was: {booking.check_in_date}")
                
                # Chuyển booking thành NO_SHOW
                booking.status = BookingStatus.NO_SHOW
                booking.save()
                
                # Giải phóng phòng
                for room in booking.rooms.all():
                    if room.status in ['booked', 'available']:
                        old_status = room.status
                        room.status = 'available'
                        room.save()
                        
                        updated_rooms.append({
                            'room_number': room.room_number,
                            'booking_id': booking.id,
                            'old_status': old_status,
                            'new_status': 'available',
                            'reason': 'no_show',
                            'check_in_date': booking.check_in_date.isoformat()
                        })
                        
                        logger.info(f"Released room {room.room_number} due to no-show booking {booking.id}")
                
                # Tạo thông báo no-show
                try:
                    Notification.objects.create(
                        user=booking.customer,
                        notification_type='booking_confirmation',
                        title='Booking đã bị hủy - No Show',
                        message=f'Booking {booking.id} đã bị hủy do không check-in đúng thời gian.'
                    )
                except Exception as e:
                    logger.error(f"Failed to create no-show notification for booking {booking.id}: {str(e)}")
            
            result = {
                'success': True,
                'message': f'Room status update completed successfully',
                'timestamp': now.isoformat(),
                'summary': {
                    'total_rooms_updated': len(updated_rooms),
                    'bookings_processed': pending_bookings.count(),
                    'no_show_bookings': overdue_bookings.count(),
                    'errors_count': len(errors)
                },
                'updated_rooms': updated_rooms
            }
            
            if errors:
                result['errors'] = errors
                result['success'] = False
                
            logger.info(f"Room status update task completed: {result['summary']}")
            
            return Response(result, status=status.HTTP_200_OK)
            
        except Exception as e:
            error_result = {
                'success': False,
                'message': f'Room status update failed: {str(e)}',
                'timestamp': now.isoformat(),
                'updated_rooms': updated_rooms,
                'errors': errors + [str(e)]
            }
            
            logger.error(f"Room status update task failed: {str(e)}")
            return Response(error_result, status=status.HTTP_500_INTERNAL_SERVER_ERROR)