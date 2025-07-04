from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Định nghĩa router cho các ViewSet
router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'room-types', views.RoomTypeViewSet)
router.register(r'rooms', views.RoomViewSet)
router.register(r'bookings', views.BookingViewSet)
router.register(r'rentals', views.RoomRentalViewSet)
router.register(r'payments', views.PaymentViewSet)
router.register(r'discount-codes', views.DiscountCodeViewSet)
router.register(r'notifications', views.NotificationViewSet)

# Định nghĩa các URL patterns
urlpatterns = [
    # Định nghĩa để trả về đoạn văn bản để test cho trang chủ
    path('', views.home, name='home'),
    
    # API endpoints
    path('api/', include(router.urls)),
    
    # QR Code endpoints
    path('api/qr-scan/', views.QRCodeScanView.as_view(), name='qr-scan'),
    path('api/qr-generate/', views.QRCodeGenerateView.as_view(), name='qr-generate'),
    
    # Stats endpoint
    path('api/stats/', views.StatsView.as_view(), name='stats'),
    
    # VNPay endpoints
    path('vnpay/create-payment/', views.create_payment_url, name='create_payment_url'),
    path('vnpay/redirect/', views.vnpay_redirect, name='vnpay_redirect'),
]