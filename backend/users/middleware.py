# users/middleware.py
from django.utils import timezone
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)

class UpdateLastActiveMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Update last_active for authenticated users
        if request.user.is_authenticated:
            try:
                User = get_user_model()
                # Use update() for better performance
                User.objects.filter(id=request.user.id).update(last_active=timezone.now())
            except Exception as e:
                logger.error(f"Failed to update last_active for user {request.user.email}: {e}")
            
        return response