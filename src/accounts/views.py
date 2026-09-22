from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import UserProfile
from .serializers import UserProfileSerializer


class CurrentUserProfileAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get_profile(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return profile

    def get(self, request):
        return Response(UserProfileSerializer(self.get_profile(request)).data)

    def patch(self, request):
        profile = self.get_profile(request)
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return Response(UserProfileSerializer(serializer.save()).data)
