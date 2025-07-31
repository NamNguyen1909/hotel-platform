from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Định nghĩa router cho các ViewSet
router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'room-types', views.RoomTypeViewSet)
router.register(r'rooms', views.RoomViewSet)
router.register(r'room-images', views.RoomImageViewSet)
router.register(r'bookings', views.BookingViewSet)
router.register(r'rentals', views.RoomRentalViewSet)
router.register(r'payments', views.PaymentViewSet)
router.register(r'discount-codes', views.DiscountCodeViewSet)
router.register(r'notifications', views.NotificationViewSet)

# Định nghĩa các URL patterns
urlpatterns = [
    path('', include(router.urls)),
    
    # QR Code endpoints
    path('api/qr-payment/', views.QRCodePaymentView.as_view(), name='qr-payment'),
    path('api/qr-generate/', views.QRCodeGenerateView.as_view(), name='qr-generate'),
    
    # Manual RoomRental endpoint
    path('api/rentals/create-manual/', views.RoomRentalViewSet.as_view({'post': 'create_manual_rental'}), name='create-manual-rental'),
    
    # Stats endpoint
    path('api/stats/', views.StatsView.as_view(), name='stats'),
    
    # VNPay endpoints
    path('vnpay/create-payment/', views.create_payment_url, name='create_payment_url'),
    path('vnpay/redirect/', views.vnpay_redirect, name='vnpay_redirect'),
]