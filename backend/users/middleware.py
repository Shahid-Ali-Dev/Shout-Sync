
# middleware.py
from django.utils import timezone
from .models import User

class UpdateLastActiveMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Update last_active for authenticated users
        if request.user.is_authenticated:
            User.objects.filter(id=request.user.id).update(last_active=timezone.now())
            
        return response
