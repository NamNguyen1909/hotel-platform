from rest_framework import permissions
from .models import User


class IsAdminUser(permissions.BasePermission):
    """
    Quyền chỉ dành cho Admin
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


class IsOwnerUser(permissions.BasePermission):
    """
    Quyền chỉ dành cho Owner (chủ khách sạn)
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'owner'


class IsStaffUser(permissions.BasePermission):
    """
    Quyền chỉ dành cho Staff (nhân viên)
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'staff'


class IsCustomerUser(permissions.BasePermission):
    """
    Quyền chỉ dành cho Customer (khách hàng)
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'customer'


class IsAdminOrOwner(permissions.BasePermission):
    """
    Quyền dành cho Admin hoặc Owner
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.role in ['admin', 'owner'])


class IsAdminOrOwnerOrStaff(permissions.BasePermission):
    """
    Quyền dành cho Admin, Owner hoặc Staff
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.role in ['admin', 'owner', 'staff'])


class IsBookingOwner(permissions.BasePermission):
    """
    Quyền chỉ cho phép customer sở hữu booking hoặc staff
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Admin và Owner có thể truy cập mọi booking
        if request.user.role in ['admin', 'owner']:
            return True
        # Staff có thể truy cập mọi booking
        if request.user.role == 'staff':
            return True
        # Customer chỉ có thể truy cập booking của mình
        if request.user.role == 'customer':
            return obj.customer == request.user
        return False


class IsRoomRentalOwner(permissions.BasePermission):
    """
    Quyền chỉ cho phép customer sở hữu rental hoặc staff
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Admin và Owner có thể truy cập mọi rental
        if request.user.role in ['admin', 'owner']:
            return True
        # Staff có thể truy cập mọi rental
        if request.user.role == 'staff':
            return True
        # Customer chỉ có thể truy cập rental của mình
        if request.user.role == 'customer':
            return obj.customer == request.user
        return False


class IsPaymentOwner(permissions.BasePermission):
    """
    Quyền chỉ cho phép customer sở hữu payment hoặc staff
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Admin và Owner có thể truy cập mọi payment
        if request.user.role in ['admin', 'owner']:
            return True
        # Staff có thể truy cập mọi payment
        if request.user.role == 'staff':
            return True
        # Customer chỉ có thể truy cập payment của mình
        if request.user.role == 'customer':
            return obj.rental.customer == request.user
        return False


class IsNotificationOwner(permissions.BasePermission):
    """
    Quyền chỉ cho phép user xem notification của mình
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Admin có thể xem mọi notification
        if request.user.role == 'admin':
            return True
        # User chỉ có thể xem notification của mình
        return obj.user == request.user


class CanManageRooms(permissions.BasePermission):
    """
    Quyền quản lý phòng: Admin, Owner, Staff
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.role in ['admin', 'owner', 'staff'])


class CanManageBookings(permissions.BasePermission):
    """
    Quyền quản lý booking: Admin, Owner, Staff
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.role in ['admin', 'owner', 'staff'])


class CanManagePayments(permissions.BasePermission):
    """
    Quyền quản lý thanh toán: Admin, Owner, Staff
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.role in ['admin', 'owner', 'staff'])


class CanCreateDiscountCode(permissions.BasePermission):
    """
    Quyền tạo mã giảm giá: Admin, Owner
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.role in ['admin', 'owner'])


class CanViewStats(permissions.BasePermission):
    """
    Quyền xem thống kê: Admin, Owner
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.role in ['admin', 'owner'])


class CanCheckIn(permissions.BasePermission):
    """
    Quyền thực hiện check-in: Admin, Owner, Staff
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.role in ['admin', 'owner', 'staff'])


class CanCheckOut(permissions.BasePermission):
    """
    Quyền thực hiện check-out: Admin, Owner, Staff
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.role in ['admin', 'owner', 'staff'])


class CanConfirmBooking(permissions.BasePermission):
    """
    Quyền xác nhận booking: Admin, Owner, Staff
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.role in ['admin', 'owner', 'staff'])


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Quyền đọc cho tất cả, chỉ owner mới có thể chỉnh sửa
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return (request.user and request.user.is_authenticated and 
                request.user.role in ['admin', 'owner'])


class IsStaffOrReadOnly(permissions.BasePermission):
    """
    Quyền đọc cho tất cả, chỉ staff trở lên mới có thể chỉnh sửa
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        return (request.user and request.user.is_authenticated and 
                request.user.role in ['admin', 'owner', 'staff'])


class CanManageCustomers(permissions.BasePermission):
    """
    Quyền quản lý user: Admin, Owner
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.role in ['admin', 'owner', 'staff'])


class CanUpdateProfile(permissions.BasePermission):
    """
    Quyền cập nhật profile: user chỉ có thể cập nhật profile của mình
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Admin có thể cập nhật profile của mọi user
        if request.user.role in ['admin', 'owner']:
            return True
        # User chỉ có thể cập nhật profile của mình
        return obj == request.user


class CanCancelUpdateBooking(permissions.BasePermission):
    """
    Quyền hủy booking
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Admin, Owner, Staff có thể hủy mọi booking
        if request.user.role in ['admin', 'owner', 'staff']:
            return True
        # Customer chỉ có thể hủy booking của mình
        if request.user.role == 'customer':
            return obj.customer == request.user
        return False


class CanCreateNotification(permissions.BasePermission):
    """
    Quyền tạo thông báo: Admin, Owner
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.role in ['admin', 'owner'])


class CanModifyRoomType(permissions.BasePermission):
    """
    Quyền tạo/sửa loại phòng: Admin, Owner
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.role in ['admin', 'owner'])


class CanAccessAllBookings(permissions.BasePermission):
    """
    Quyền truy cập tất cả booking: Admin, Owner, Staff
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.role in ['admin', 'owner', 'staff'])


class CanAccessAllRentals(permissions.BasePermission):
    """
    Quyền truy cập tất cả rental: Admin, Owner, Staff
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.role in ['admin', 'owner', 'staff'])


class CanAccessAllPayments(permissions.BasePermission):
    """
    Quyền truy cập tất cả payment: Admin, Owner, Staff
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.role in ['admin', 'owner', 'staff'])


class CanManageStaff(permissions.BasePermission):
    """
    Quyền quản lý nhân viên: Admin, Owner
    """
    def has_permission(self, request, view):
        return (request.user and request.user.is_authenticated and 
                request.user.role in ['admin', 'owner'])


class CanCreateBooking(permissions.BasePermission):
    """
    Quyền cho phép customer, admin, owner, staff tạo booking
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role in ['customer', 'admin', 'owner', 'staff']


# Định nghĩa mapping role permissions cho dễ sử dụng
ROLE_PERMISSIONS = {
    'admin': [
        'can_manage_users',
        'can_manage_rooms',
        'can_manage_bookings',
        'can_manage_payments',
        'can_create_discount_code',
        'can_view_stats',
        'can_check_in',
        'can_check_out',
        'can_confirm_booking',
        'can_create_notification',
        'can_modify_room_type',
        'can_access_all_bookings',
        'can_access_all_rentals',
        'can_access_all_payments',
    ],
    'owner': [
        'can_manage_rooms',
        'can_manage_bookings',
        'can_manage_payments',
        'can_create_discount_code',
        'can_view_stats',
        'can_check_in',
        'can_check_out',
        'can_confirm_booking',
        'can_create_notification',
        'can_modify_room_type',
        'can_access_all_bookings',
        'can_access_all_rentals',
        'can_access_all_payments',
    ],
    'staff': [
        'can_manage_rooms',
        'can_manage_bookings',
        'can_manage_payments',
        'can_check_in',
        'can_check_out',
        'can_confirm_booking',
        'can_access_all_bookings',
        'can_access_all_rentals',
        'can_access_all_payments',
    ],
    'customer': [
        'can_create_booking',
        'can_cancel_own_booking',
        'can_view_own_booking',
        'can_view_own_rental',
        'can_view_own_payment',
        'can_update_profile',
    ],
}


def has_permission(user, permission):
    """
    Kiểm tra user có quyền cụ thể không
    """
    if not user or not user.is_authenticated:
        return False
    
    user_permissions = ROLE_PERMISSIONS.get(user.role, [])
    return permission in user_permissions


def get_user_permissions(user):
    """
    Lấy danh sách quyền của user
    """
    if not user or not user.is_authenticated:
        return []
    
    return ROLE_PERMISSIONS.get(user.role, [])

class CanAccessAllBookings(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and hasattr(request.user, 'role') and request.user.role in ['staff', 'admin', 'owner']
