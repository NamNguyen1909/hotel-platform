from rest_framework.pagination import PageNumberPagination

class ItemPaginator(PageNumberPagination):
    page_size = 10  # Mặc định 10 mục mỗi trang
    page_size_query_param = 'page_size'
    max_page_size = 100  # Kích thước trang tối đa có thể yêu cầu từ client
    page_query_param = 'page'  # Tên tham số truy vấn cho trang
    last_page_strings = ['last']  # Tên chuỗi cho trang cuối cùng