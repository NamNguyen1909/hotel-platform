from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Định nghĩa router cho các ViewSet
router = DefaultRouter()
router.register(r'users', views.UserViewSet, basename='user')
router.register(r'room-types', views.RoomTypeViewSet, basename='room-type')
router.register(r'rooms', views.RoomViewSet, basename='room')
router.register(r'room-images', views.RoomImageViewSet, basename='room-image')
router.register(r'bookings', views.BookingViewSet, basename='booking')
router.register(r'rentals', views.RoomRentalViewSet, basename='rental')
router.register(r'payments', views.PaymentViewSet, basename='payment')
router.register(r'discount-codes', views.DiscountCodeViewSet, basename='discount-code')
router.register(r'notifications', views.NotificationViewSet, basename='notification')
router.register(r'invoices', views.InvoiceViewSet, basename='invoice')

# Định nghĩa các URL patterns
urlpatterns = [
    path('', include(router.urls)),
    
    # Manual RoomRental endpoint
    path('api/rentals/create-manual/', views.RoomRentalViewSet.as_view({'post': 'create_manual_rental'}), name='create-manual-rental'),
    
    # Booking calculate price endpoint
    path('api/bookings/calculate-price/', views.BookingViewSet.as_view({'post': 'calculate_price'}), name='calculate-price'),
    
    # Stats endpoint
    path('api/stats/', views.StatsView.as_view(), name='stats'),
    
    # Room status update task endpoint
    path('api/tasks/update-room-status/', views.RoomStatusUpdateTaskView.as_view(), name='update-room-status-task'),
    path('api/tasks/status/', views.TaskStatusView.as_view(), name='task-status'),
    
    # VNPay endpoints
    path('vnpay/create-payment/', views.create_payment_url, name='create_payment_url'),
    path('vnpay/redirect/', views.vnpay_redirect, name='vnpay_redirect'),
]