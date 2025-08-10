# Simple health check for Render deployment
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.views.decorators.cache import never_cache
import json

@csrf_exempt
@never_cache
@require_http_methods(["GET", "HEAD"])
def simple_health_check(request):
    """
    Ultra-simple health check endpoint for Render.com deployment
    Returns minimal response to ensure service is running
    """
    response_data = {
        'status': 'healthy',
        'service': 'hotel-platform-api'
    }
    
    response = JsonResponse(response_data, status=200)
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    
    return response

@csrf_exempt
@never_cache
@require_http_methods(["GET", "HEAD"])
def detailed_health_check(request):
    """
    More detailed health check that includes database connectivity
    """
    try:
        from django.utils import timezone
        from django.db import connection
        
        # Test database connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            db_status = 'connected'
            
        response_data = {
            'status': 'healthy',
            'service': 'hotel-platform-api',
            'timestamp': timezone.now().isoformat(),
            'database': db_status
        }
        status_code = 200
        
    except Exception as e:
        response_data = {
            'status': 'unhealthy',
            'service': 'hotel-platform-api',
            'error': str(e),
            'database': 'disconnected'
        }
        status_code = 503
    
    response = JsonResponse(response_data, status=status_code)
    response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response['Pragma'] = 'no-cache'
    response['Expires'] = '0'
    
    return response
