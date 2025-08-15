#!/usr/bin/env python
"""
Test Script for RoomStatusUpdateTaskView
Simulates cron-job.org calls to test room status automation
"""

import os
import sys
import django
import json
from datetime import datetime, timedelta
from django.utils import timezone
from django.http import JsonResponse
from django.test import RequestFactory

# Add the Django project to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotelplatformapi.settings')
django.setup()

from hotelplatform.models import Booking, Room, User, RoomType, BookingStatus
from hotelplatform.views import RoomStatusUpdateTaskView

class RoomStatusTaskTester:
    def __init__(self):
        # Configuration
        self.api_key = "hotel-platform-cron-2025"  # Default from views.py
        self.view = RoomStatusUpdateTaskView()
        self.factory = RequestFactory()
        
        print("🚀 Room Status Task Tester Initialized")
        print("📍 Testing direct function call (local)")
        print(f"🔑 Using API key: {self.api_key}")
        print("=" * 60)

    def create_test_data(self):
        """
        Tạo test data với các booking ở các trạng thái khác nhau
        """
        print("📊 Creating test data...")
        
        try:
            # Tạo customer test
            customer, created = User.objects.get_or_create(
                username="test_customer",
                defaults={
                    'email': 'test@example.com',
                    'role': 'customer',
                    'full_name': 'Test Customer'
                }
            )
            
            # Tạo room type test
            room_type, created = RoomType.objects.get_or_create(
                name="Test Room Type",
                defaults={
                    'base_price': 1000000,
                    'max_guests': 2
                }
            )
            
            # Tạo rooms test
            rooms = []
            for i in range(1, 4):  # Tạo 3 phòng test
                room, created = Room.objects.get_or_create(
                    room_number=f"TEST{i:03d}",
                    defaults={
                        'room_type': room_type,
                        'status': 'available'
                    }
                )
                rooms.append(room)
            
            # Xóa booking cũ để test clean
            Booking.objects.filter(customer=customer).delete()
            
            now = timezone.now()
            
            # Scenario 1: Booking đã đến ngày check-in (hôm nay) - should update room to 'booked'
            booking1 = Booking.objects.create(
                customer=customer,
                check_in_date=now.replace(hour=14, minute=0, second=0, microsecond=0),  # 2PM today
                check_out_date=now + timedelta(days=2),
                total_price=2000000,
                guest_count=2,
                status=BookingStatus.CONFIRMED
            )
            booking1.rooms.add(rooms[0])
            rooms[0].status = 'available'  # Reset to available để test update
            rooms[0].save()
            
            # Scenario 2: Booking quá hạn check-in (hôm qua) - should be marked as no-show
            booking2 = Booking.objects.create(
                customer=customer,
                check_in_date=now - timedelta(days=1, hours=10),  # Yesterday 10AM
                check_out_date=now + timedelta(days=1),
                total_price=1500000,
                guest_count=1,
                status=BookingStatus.CONFIRMED
            )
            booking2.rooms.add(rooms[1])
            rooms[1].status = 'booked'  # Đặt là booked để test giải phóng
            rooms[1].save()
            
            # Scenario 3: Booking tương lai - should not be affected
            booking3 = Booking.objects.create(
                customer=customer,
                check_in_date=now + timedelta(days=2),
                check_out_date=now + timedelta(days=4),
                total_price=3000000,
                guest_count=2,
                status=BookingStatus.CONFIRMED
            )
            booking3.rooms.add(rooms[2])
            
            print("✅ Test data created successfully:")
            print(f"   📅 Booking 1 (Today check-in): {booking1.id} - Room {rooms[0].room_number} ({rooms[0].status})")
            print(f"   📅 Booking 2 (Overdue): {booking2.id} - Room {rooms[1].room_number} ({rooms[1].status})")
            print(f"   📅 Booking 3 (Future): {booking3.id} - Room {rooms[2].room_number} ({rooms[2].status})")
            
            return {
                'bookings': [booking1, booking2, booking3],
                'rooms': rooms
            }
            
        except Exception as e:
            print(f"❌ Error creating test data: {e}")
            return None

    def call_room_status_function(self):
        """
        Gọi trực tiếp function thay vì qua HTTP API
        """
        print("\n🔄 Calling Room Status Update Function...")
        
        try:
            # Tạo mock request với API key
            request = self.factory.post(
                '/api/tasks/update-room-status/',
                data=json.dumps({
                    'api_key': self.api_key,
                    'trigger': 'test',
                    'timestamp': datetime.now().isoformat()
                }),
                content_type='application/json',
                HTTP_X_API_KEY=self.api_key
            )
            
            print(f"📤 Calling function directly with API key: {self.api_key}")
            print(f"📋 Request data: api_key={self.api_key}, trigger=test")
            
            # Gọi trực tiếp function
            response = self.view.post(request)
            
            print(f"\n📥 Response Status: {response.status_code}")
            
            # Handle DRF Response data directly
            if hasattr(response, 'data'):
                try:
                    print(f"📊 Response Body:")
                    print(json.dumps(response.data, indent=2, ensure_ascii=False, default=str))
                    return response.data
                except Exception as parse_error:
                    print(f"❌ Parse error: {parse_error}")
            
            # Fallback cho regular Django response
            elif hasattr(response, 'content'):
                try:
                    response_data = json.loads(response.content.decode('utf-8'))
                    print(f"📊 Response Body:")
                    print(json.dumps(response_data, indent=2, ensure_ascii=False))
                    return response_data
                except Exception as parse_error:
                    print(f"📄 Response Content (raw): {response.content}")
                    print(f"❌ Parse error: {parse_error}")
            
            return response
            
        except Exception as e:
            print(f"❌ Function call failed: {e}")
            import traceback
            traceback.print_exc()
            return None

    def verify_results(self, test_data):
        """
        Kiểm tra kết quả sau khi gọi API
        """
        print("\n🔍 Verifying results...")
        
        if not test_data:
            print("❌ No test data to verify")
            return
        
        try:
            # Refresh từ database
            for room in test_data['rooms']:
                room.refresh_from_db()
            
            for booking in test_data['bookings']:
                booking.refresh_from_db()
            
            print("📊 Results after API call:")
            
            # Check booking 1 (today check-in)
            booking1 = test_data['bookings'][0]
            room1 = test_data['rooms'][0]
            print(f"   📅 Booking 1 (Today): Status={booking1.status}, Room={room1.room_number} Status={room1.status}")
            
            # Check booking 2 (overdue)
            booking2 = test_data['bookings'][1]
            room2 = test_data['rooms'][1]
            print(f"   📅 Booking 2 (Overdue): Status={booking2.status}, Room={room2.room_number} Status={room2.status}")
            
            # Check booking 3 (future)
            booking3 = test_data['bookings'][2]
            room3 = test_data['rooms'][2]
            print(f"   📅 Booking 3 (Future): Status={booking3.status}, Room={room3.room_number} Status={room3.status}")
            
            # Expected results
            print("\n✅ Expected vs Actual:")
            
            # Room 1 should be 'booked' (today check-in)
            expected_room1 = 'booked'
            actual_room1 = room1.status
            result1 = "✅" if actual_room1 == expected_room1 else "❌"
            print(f"   {result1} Room 1: Expected={expected_room1}, Actual={actual_room1}")
            
            # Booking 2 should be 'no_show', Room 2 should be 'available'
            expected_booking2 = BookingStatus.NO_SHOW
            expected_room2 = 'available'
            actual_booking2 = booking2.status
            actual_room2 = room2.status
            result2a = "✅" if actual_booking2 == expected_booking2 else "❌"
            result2b = "✅" if actual_room2 == expected_room2 else "❌"
            print(f"   {result2a} Booking 2: Expected={expected_booking2}, Actual={actual_booking2}")
            print(f"   {result2b} Room 2: Expected={expected_room2}, Actual={actual_room2}")
            
            # Room 3 should remain 'available' (future booking)
            expected_room3 = 'available'
            actual_room3 = room3.status
            result3 = "✅" if actual_room3 == expected_room3 else "❌"
            print(f"   {result3} Room 3: Expected={expected_room3}, Actual={actual_room3}")
            
        except Exception as e:
            print(f"❌ Error verifying results: {e}")

    def cleanup_test_data(self):
        """
        Dọn dẹp test data
        """
        print("\n🧹 Cleaning up test data...")
        
        try:
            # Xóa test bookings
            deleted_bookings = Booking.objects.filter(customer__username="test_customer").delete()
            print(f"   🗑️ Deleted {deleted_bookings[0]} bookings")
            
            # Reset test rooms
            test_rooms = Room.objects.filter(room_number__startswith="TEST")
            for room in test_rooms:
                room.status = 'available'
                room.save()
            print(f"   🔄 Reset {test_rooms.count()} test rooms to available")
            
            print("✅ Cleanup completed")
            
        except Exception as e:
            print(f"❌ Error during cleanup: {e}")

    def run_full_test(self):
        """
        Chạy test đầy đủ
        """
        print("🎯 Starting Full Room Status Update Test")
        print("=" * 60)
        
        # Step 1: Create test data
        test_data = self.create_test_data()
        if not test_data:
            print("❌ Failed to create test data. Aborting test.")
            return
        
        # Step 2: Call function directly
        response = self.call_room_status_function()
        if not response:
            print("❌ Function call failed. Aborting test.")
            return
        
        # Step 3: Verify results
        self.verify_results(test_data)
        
        # Step 4: Cleanup
        self.cleanup_test_data()
        
        print("\n" + "=" * 60)
        print("🏁 Test completed!")

    def test_function_security(self):
        """
        Test function security với wrong API key
        """
        print("\n🔒 Testing Function Security...")
        
        try:
            # Test với wrong API key
            request = self.factory.post(
                '/api/tasks/update-room-status/',
                data=json.dumps({'test': True}),
                content_type='application/json',
                HTTP_X_API_KEY='wrong-api-key'
            )
            
            response = self.view.post(request)
            
            print(f"📥 Response Status with wrong key: {response.status_code}")
            
            if response.status_code == 401:
                print("✅ Security test passed - unauthorized access blocked")
            else:
                print("❌ Security test failed - unauthorized access allowed")
                
        except Exception as e:
            print(f"❌ Security test error: {e}")

if __name__ == "__main__":
    tester = RoomStatusTaskTester()
    
    # Parse command line arguments
    import argparse
    parser = argparse.ArgumentParser(description='Test Room Status Update Task')
    parser.add_argument('--security-only', action='store_true', help='Run only security test')
    parser.add_argument('--no-cleanup', action='store_true', help='Skip cleanup after test')
    
    args = parser.parse_args()
    
    # Run tests
    if args.security_only:
        tester.test_function_security()
    else:
        tester.run_full_test()
        if not args.no_cleanup:
            tester.test_function_security()
