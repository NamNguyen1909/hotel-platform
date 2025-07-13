from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

class ItemPaginator(PageNumberPagination):
    page_size = 10  # Mặc định 10 mục mỗi trang
    page_size_query_param = 'page_size'
    max_page_size = 100  # Kích thước trang tối đa có thể yêu cầu từ client
    page_query_param = 'page'  # Tên tham số truy vấn cho trang
    last_page_strings = ['last']  # Tên chuỗi cho trang cuối cùng

    def get_paginated_response(self, data):
        return Response({
            'links': {
                'next': self.get_next_link(),
                'previous': self.get_previous_link()
            },
            'count': self.page.paginator.count,
            'page_size': self.page_size,
            'current_page': self.page.number,
            'total_pages': self.page.paginator.num_pages,
            'results': data
        })

class UserPaginator(PageNumberPagination):
    page_size = 15  # Phù hợp cho quản lý user
    page_size_query_param = 'page_size'
    max_page_size = 50
    page_query_param = 'page'
    last_page_strings = ['last']

    def get_paginated_response(self, data):
        return Response({
            'links': {
                'next': self.get_next_link(),
                'previous': self.get_previous_link()
            },
            'count': self.page.paginator.count,
            'page_size': self.page_size,
            'current_page': self.page.number,
            'total_pages': self.page.paginator.num_pages,
            'results': data
        })

class RoomPaginator(PageNumberPagination):
    page_size = 12  # Phù hợp cho hiển thị phòng dạng grid
    page_size_query_param = 'page_size'
    max_page_size = 60
    page_query_param = 'page'
    last_page_strings = ['last']

    def get_paginated_response(self, data):
        # Import Room model để tính thống kê
        from .models import Room
        
        # Tính thống kê tổng từ toàn bộ queryset không phân trang
        total_rooms = Room.objects.count()
        available_rooms = Room.objects.filter(status='available').count()
        booked_rooms = Room.objects.filter(status='booked').count()
        occupied_rooms = Room.objects.filter(status='occupied').count()
        
        return Response({
            'links': {
                'next': self.get_next_link(),
                'previous': self.get_previous_link()
            },
            'count': self.page.paginator.count,
            'page_size': self.page_size,
            'current_page': self.page.number,
            'total_pages': self.page.paginator.num_pages,
            'stats': {
                'total_rooms': total_rooms,
                'available_rooms': available_rooms,
                'booked_rooms': booked_rooms,
                'occupied_rooms': occupied_rooms
            },
            'results': data
        })

class RoomTypePaginator(PageNumberPagination):
    page_size = 8  # Ít loại phòng hơn
    page_size_query_param = 'page_size'
    max_page_size = 30
    page_query_param = 'page'
    last_page_strings = ['last']

    def get_paginated_response(self, data):
        # Import models để tính thống kê
        from .models import RoomType, Room
        
        # Tính thống kê tổng
        total_room_types = RoomType.objects.count()
        room_counts_by_type = {}
        
        # Đếm số phòng cho mỗi loại phòng
        room_types = RoomType.objects.all()
        for room_type in room_types:
            room_counts_by_type[room_type.id] = Room.objects.filter(room_type=room_type).count()
        
        return Response({
            'links': {
                'next': self.get_next_link(),
                'previous': self.get_previous_link()
            },
            'count': self.page.paginator.count,
            'page_size': self.page_size,
            'current_page': self.page.number,
            'total_pages': self.page.paginator.num_pages,
            'stats': {
                'total_room_types': total_room_types,
                'room_counts_by_type': room_counts_by_type
            },
            'results': data
        })