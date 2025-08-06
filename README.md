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

Logic Phân Bổ Thông Minh Hoạt Động:
Bước 1: Sắp xếp phòng theo max_guests giảm dần
Bước 2: Phân bổ tối đa cho mỗi phòng (không vượt max_guests)
Bước 3: Phân bổ đều khách dư thừa (tạo phụ thu hợp lý)
Bước 4: Tính giá cho từng phòng với phụ thu (nếu có)


5 khách + 3 phòng [max_guests: 4, 2, 2]
→ Sắp xếp: [4, 2, 2]  
→ Phân bổ ban đầu: [4, 1, 0] (còn dư 0)
→ Kết quả: [4 khách, 1 khách, 0 khách]
→ Phụ thu: [0%, 0%, 0%] - Không có phụ thu!

8 khách + 3 phòng [max_guests: 4, 2, 2] 
→ Phân bổ ban đầu: [4, 2, 2] (còn dư 0)
→ Kết quả: [4 khách, 2 khách, 2 khách] - Perfect fit!

10 khách + 3 phòng [max_guests: 4, 2, 2]
→ Phân bổ ban đầu: [4, 2, 2] (còn dư 2)
→ Phân bổ dư: [1, 1, 0] → [5, 3, 2]
→ Phụ thu: [25% x 1, 25% x 1, 0%]