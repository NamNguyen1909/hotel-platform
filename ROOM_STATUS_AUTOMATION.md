# ROOM STATUS AUTO-UPDATE SETUP

## Cách sử dụng Django Management Command

### 1. Chạy thủ công để test:
```bash
# Dry run (xem trước không thay đổi)
python manage.py update_room_status --dry-run --verbose

# Chạy thực tế
python manage.py update_room_status --verbose
```

### 2. Setup Cron Job (Linux/Mac):
```bash
# Mở crontab
crontab -e

# Thêm dòng này để chạy mỗi giờ vào phút thứ 5
5 * * * * cd /path/to/your/project && /path/to/python manage.py update_room_status >> /var/log/room_status_update.log 2>&1

# Hoặc chạy mỗi 30 phút
*/30 * * * * cd /path/to/your/project && /path/to/python manage.py update_room_status

# Kiểm tra cron job đang chạy
crontab -l
```

### 3. Setup Task Scheduler (Windows):
1. Mở Task Scheduler
2. Create Basic Task
3. Trigger: Daily, repeat every 1 hour
4. Action: Start a program
   - Program: python.exe
   - Arguments: manage.py update_room_status
   - Start in: /path/to/your/project

## Cách sử dụng API Endpoint

### 1. Gọi API từ external system:
```bash
# POST request để trigger update
curl -X POST http://localhost:8000/api/tasks/update-room-status/
```

### 2. Setup với monitoring service (Uptime Robot, etc.):
- URL: `http://yourdomain.com/api/tasks/update-room-status/`
- Method: POST
- Interval: Every 1 hour
- Monitor response để đảm bảo task chạy thành công

### 3. Response format:
```json
{
    "success": true,
    "message": "Room status update completed successfully",
    "timestamp": "2025-08-04T12:00:00Z",
    "summary": {
        "total_rooms_updated": 5,
        "bookings_processed": 3,
        "no_show_bookings": 1,
        "errors_count": 0
    },
    "updated_rooms": [
        {
            "room_number": "101",
            "booking_id": 1350,
            "old_status": "available",
            "new_status": "booked",
            "check_in_date": "2025-08-04T14:00:00Z"
        }
    ]
}
```

## Kiến nghị thời gian chạy:

1. **Mỗi giờ:** Đảm bảo phòng được update status đúng thời gian
2. **Mỗi 30 phút:** Nếu muốn responsive hơn
3. **Mỗi 6 giờ:** Xử lý no-show bookings

## Monitoring và Debug:

1. **Check logs:** 
   ```bash
   tail -f /var/log/room_status_update.log
   ```

2. **Test trước khi deploy:**
   ```bash
   python manage.py update_room_status --dry-run --verbose
   ```

3. **Check database sau khi chạy:**
   ```sql
   SELECT room_number, status FROM hotelplatform_room WHERE status = 'booked';
   SELECT id, status, check_in_date FROM hotelplatform_booking WHERE status IN ('pending', 'confirmed');
   ```
