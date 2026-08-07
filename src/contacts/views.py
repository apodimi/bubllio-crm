from django.db.models import Q
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Contact
from .serializers import ContactSerializer


class ContactListCreateAPIView(APIView):
    def get(self, request):
        contacts = Contact.objects.all()
        search = request.query_params.get("search")

        if search:
            contacts = contacts.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone_number__icontains=search) |
                Q(department__icontains=search) |
                Q(job_title__icontains=search)
            )

        serializer = ContactSerializer(contacts, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = ContactSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)

        return Response(serializer.errors, status=400)
