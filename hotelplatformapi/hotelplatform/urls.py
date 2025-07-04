from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Định nghĩa router cho các ViewSet
router = DefaultRouter()


# Định nghĩa các URL patterns
urlpatterns = [
    #định nghĩa để trả về đoạn văn bản để test cho trang chủ
    path('', views.home, name='home'),

    # path('', include(router.urls)),
]