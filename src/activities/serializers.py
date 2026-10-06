from rest_framework import serializers

from organizations.models import OrganizationMembership

from .models import Task


class TaskSerializer(serializers.ModelSerializer):
    company_name = serializers.CharField(source="company.name", read_only=True)
    contact_name = serializers.SerializerMethodField()
    deal_title = serializers.CharField(source="deal.title", read_only=True, default="")
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    completed_by_name = serializers.SerializerMethodField()
    effective_status = serializers.CharField(read_only=True)

    @staticmethod
    def _user_name(user):
        return (user.get_full_name() or user.username) if user else ""

    def get_contact_name(self, task):
        return str(task.contact) if task.contact else ""

    def get_assigned_to_name(self, task):
        return self._user_name(task.assigned_to)

    def get_created_by_name(self, task):
        return self._user_name(task.created_by)

    def get_completed_by_name(self, task):
        return self._user_name(task.completed_by)

    def validate(self, attrs):
        organization = self.context.get("organization") or getattr(
            self.instance, "organization", None
        )
        company = attrs.get("company", getattr(self.instance, "company", None))
        contact = attrs.get("contact", getattr(self.instance, "contact", None))
        deal = attrs.get("deal", getattr(self.instance, "deal", None))
        owner = attrs.get("assigned_to", getattr(self.instance, "assigned_to", None))
        due_at = attrs.get("due_at", getattr(self.instance, "due_at", None))
        reminder_at = attrs.get(
            "reminder_at", getattr(self.instance, "reminder_at", None)
        )

        if company and company.organization_id != organization.id:
            raise serializers.ValidationError(
                {"company": "Choose a company from this workspace."}
            )
        if contact and (
            contact.organization_id != organization.id
            or contact.company_id != company.id
        ):
            raise serializers.ValidationError(
                {"contact": "Choose a contact from the selected company."}
            )
        if deal and (
            deal.organization_id != organization.id or deal.company_id != company.id
        ):
            raise serializers.ValidationError(
                {"deal": "Choose a deal from the selected company."}
            )
        if owner and not OrganizationMembership.objects.filter(
            organization=organization, user=owner
        ).exists():
            raise serializers.ValidationError(
                {"assigned_to": "Choose a member of this workspace."}
            )
        if reminder_at and due_at and reminder_at > due_at:
            raise serializers.ValidationError(
                {"reminder_at": "The reminder must be before the due time."}
            )
        return attrs

    class Meta:
        model = Task
        fields = (
            "id",
            "organization",
            "company",
            "company_name",
            "contact",
            "contact_name",
            "deal",
            "deal_title",
            "assigned_to",
            "assigned_to_name",
            "created_by_name",
            "completed_by_name",
            "title",
            "kind",
            "priority",
            "workflow_status",
            "due_at",
            "reminder_at",
            "notes",
            "effective_status",
            "completed_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "organization",
            "company_name",
            "contact_name",
            "deal_title",
            "assigned_to_name",
            "created_by_name",
            "completed_by_name",
            "workflow_status",
            "effective_status",
            "completed_at",
            "created_at",
            "updated_at",
        )
