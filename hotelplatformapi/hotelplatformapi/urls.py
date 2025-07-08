# hotelplatformapi/urls.py
from django.contrib import admin
from django.urls import include, path, re_path
from rest_framework import permissions
from hotelplatform.admin import admin_site  # Import custom admin site

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
    # Admin URLs
    path('admin/', admin.site.urls),
    path('hotel-admin/', admin_site.urls),  # Custom admin site
    
    # App URLs - chỉ include 1 lần
    path('', include('hotelplatform.urls')),  # Root URLs
    # path('api/', include('hotelplatform.urls')),  # API URLs với prefix
    
    # JWT authentication endpoints
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'), 
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/token/blacklist/', TokenBlacklistView.as_view(), name='token_blacklist'),
    
    # OAuth2 endpoints
    path('o/', include('oauth2_provider.urls', namespace='oauth2_provider')), 
    
    # Swagger documentation
    re_path(r'^swagger(?P<format>\.json|\.yaml)$', schema_view.without_ui(cache_timeout=0), name='schema-json'), 
    re_path(r'^swagger/$', schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    re_path(r'^redoc/$', schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc')
]