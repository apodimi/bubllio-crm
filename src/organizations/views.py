from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Organization
from .serializers import OrganizationSerializer

class OrganizationListCreateAPIView(APIView):
    def get(self, request):
        organizations = Organization.objects.all()
        serializer = OrganizationSerializer(organizations, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        serializer = OrganizationSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        
        return Response(serializer.errors, status=400)

class OrganizationDetailAPIView(APIView):
    def delete(self, request, organization_id):
        try:
            organization = Organization.objects.get(id=organization_id)
            organization.delete()

            return Response(status=204)
        except Organization.DoesNotExist:
            return Response(status=404)
