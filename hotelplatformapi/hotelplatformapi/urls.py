# hotelplatformapi/urls.py
from django.contrib import admin
from django.urls import include, path, re_path
from rest_framework import permissions
from hotelplatform.admin import admin_site  # Import custom admin site
from health_check import simple_health_check, detailed_health_check  # Import health check functions

from drf_yasg.views import get_schema_view
from drf_yasg import openapi

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenBlacklistView,
)

# schema view for Swagger documentation
schema_view = get_schema_view( 
    openapi.Info(
        title="Hotel Platform API",
        default_version='v1',
        description="APIs for Hotel Platform",
        contact=openapi.Contact(email="namnguyen19092004@gmail.com"),
        license=openapi.License(name="Nam Nguyen @2025"),
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
)

urlpatterns = [
    # Health check endpoints (before other URLs for priority)
    path('health/', simple_health_check, name='health-check-simple'),
    path('health/detailed/', detailed_health_check, name='health-check-detailed'),
    
    # Admin URLs
    path('admin/', admin.site.urls),
    path('hotel-admin/', admin_site.urls),  # Custom admin site
    
    # App URLs
    path('', include('hotelplatform.urls')),  # Root URLs
    
    # JWT authentication endpoints
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'), 
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/token/blacklist/', TokenBlacklistView.as_view(), name='token_blacklist'),
    
    # OAuth2 endpoints (for future third-party authentication)
    path('o/', include('oauth2_provider.urls', namespace='oauth2_provider')),
    
    # Swagger documentation
    re_path(r'^swagger(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=0), name='schema-json'), 
    re_path(r'^swagger/$', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    re_path(r'^redoc/$', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc')
]