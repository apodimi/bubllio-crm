from contacts.models import Contact

from .models import Company


def crm_summary(organization):
    return {
        "companies": Company.objects.filter(organization=organization, archived_at__isnull=True).count(),
        "contacts": Contact.objects.filter(organization=organization, archived_at__isnull=True).count(),
    }
