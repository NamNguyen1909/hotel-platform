# hotel-platform
Hotel booking and management with django and reactjs



- Admin thường: http://127.0.0.1:8000/admin/
- Custom admin: http://127.0.0.1:8000/hotel-admin/
- Thống kê khách sạn: http://127.0.0.1:8000/hotel-admin/hotel-stats/
- Thống kê doanh thu: http://127.0.0.1:8000/hotel-admin/revenue-stats/

# hotelplatformweb-vite
```
npm run dev
```

Django RESTful API cho backend (BE) và ReactJS với Material UI (dùng Vite, biến thể JavaScript + SWC) cho frontend (FE)

### faker data
```
python manage.py seed      
```
Lệnh chạy seed.py: .\myvenv\Scripts\python.exe manage.py seed


Thuật toán "fill largest rooms first" để giảm phụ thu
Trả về detailed calculation với guest allocation
base_price * (25/100) * số_khách_vượt_quá * số_ngày