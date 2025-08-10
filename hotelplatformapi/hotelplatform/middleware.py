"""
Middleware to bypass authentication and other restrictions for health check endpoints
"""
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

class HealthCheckMiddleware(MiddlewareMixin):
    """
    Middleware that allows health check endpoints to bypass authentication
    and other restrictions that might interfere with Render's health checks
    """
    
    def process_request(self, request):
        # Check if this is a health check request
        if request.path_info in ['/health/', '/health/detailed/']:
            # Bypass CSRF and authentication for health checks
            request._dont_enforce_csrf_checks = True
            
        return None
    
    def process_response(self, request, response):
        # Add headers to prevent caching of health check responses
        if request.path_info in ['/health/', '/health/detailed/']:
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            
        return response
