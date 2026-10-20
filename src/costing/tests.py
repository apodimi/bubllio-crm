from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from companies.models import Company
from deals.models import Deal
from onboarding.services.data_export import build_workspace_data_export
from organizations.models import Organization, OrganizationMembership

from .models import CollaboratorService, DealCostLine, ExternalCollaborator


class CostingApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user("costing-user")
        self.viewer = get_user_model().objects.create_user("costing-viewer")
        self.organization = Organization.objects.create(name="Agency", slug="agency")
        self.other_organization = Organization.objects.create(name="Other", slug="other-costing")
        OrganizationMembership.objects.create(
            organization=self.organization, user=self.user, role="member"
        )
        OrganizationMembership.objects.create(
            organization=self.organization, user=self.viewer, role="viewer"
        )
        self.company = Company.objects.create(organization=self.organization, name="Customer")
        self.deal = Deal.objects.create(
            organization=self.organization,
            company=self.company,
            title="Brand project",
            value="500.00",
            currency="EUR",
            tax_rate="24.00",
        )
        self.collaborator = ExternalCollaborator.objects.create(
            organization=self.organization, name="Kostas", specialty="Graphic designer"
        )
        self.service = CollaboratorService.objects.create(
            organization=self.organization,
            collaborator=self.collaborator,
            name="Logo",
            description="Logo design",
            default_cost="50.00",
            currency="EUR",
        )
        self.client.force_authenticate(self.user)

    def collaborators_url(self):
        return reverse(
            "external-collaborator-list",
            kwargs={"organization_id": self.organization.id},
        )

    def services_url(self):
        return reverse(
            "collaborator-service-list",
            kwargs={"organization_id": self.organization.id},
        )

    def costs_url(self, deal=None):
        return reverse(
            "deal-cost-list",
            kwargs={
                "organization_id": self.organization.id,
                "deal_id": (deal or self.deal).id,
            },
        )

    def create_cost(self, **overrides):
        payload = {
            "collaborator": self.collaborator.id,
            "collaborator_service": self.service.id,
            "quantity": "1.00",
            "status": DealCostLine.Status.ESTIMATED,
        }
        payload.update(overrides)
        return self.client.post(self.costs_url(), payload, format="json")

    def test_collaborator_and_service_crud_archives_without_delete_route(self):
        created = self.client.post(
            self.collaborators_url(),
            {"name": "Maria", "specialty": "Copywriter"},
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        detail = reverse(
            "external-collaborator-detail",
            kwargs={
                "organization_id": self.organization.id,
                "collaborator_id": created.data["id"],
            },
        )
        service = self.client.post(
            self.services_url(),
            {
                "collaborator": created.data["id"],
                "name": "Copy",
                "default_cost": "40.00",
                "currency": "eur",
            },
            format="json",
        )
        self.assertEqual(service.status_code, status.HTTP_201_CREATED)
        self.assertEqual(service.data["currency"], "EUR")
        archived = self.client.patch(detail, {"is_active": False}, format="json")
        self.assertEqual(archived.status_code, status.HTTP_200_OK)
        self.assertFalse(archived.data["is_active"])
        self.assertEqual(self.client.delete(detail).status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_active_and_collaborator_filters_are_tenant_scoped(self):
        inactive = ExternalCollaborator.objects.create(
            organization=self.organization, name="Inactive", is_active=False
        )
        CollaboratorService.objects.create(
            organization=self.organization,
            collaborator=inactive,
            name="Old service",
            default_cost="1.00",
        )
        response = self.client.get(self.collaborators_url(), {"active": "true"})
        self.assertEqual([item["name"] for item in response.data], ["Kostas"])
        response = self.client.get(
            self.services_url(), {"collaborator": self.collaborator.id}
        )
        self.assertEqual([item["name"] for item in response.data], ["Logo"])

    def test_catalog_cost_is_snapshotted_and_total_is_calculated(self):
        response = self.create_cost(quantity="2.00")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["collaborator_name"], "Kostas")
        self.assertEqual(response.data["service_name"], "Logo")
        self.assertEqual(response.data["description"], "Logo design")
        self.assertEqual(response.data["unit_cost"], "50.00")
        self.assertEqual(response.data["total_cost"], "100.00")

        self.collaborator.name = "Kostas Updated"
        self.collaborator.save()
        self.service.name = "New logo"
        self.service.default_cost = Decimal("80.00")
        self.service.save()
        listed = self.client.get(self.costs_url())
        self.assertEqual(listed.data[0]["collaborator_name"], "Kostas")
        self.assertEqual(listed.data[0]["service_name"], "Logo")
        self.assertEqual(listed.data[0]["unit_cost"], "50.00")

        detail = reverse(
            "deal-cost-detail",
            kwargs={
                "organization_id": self.organization.id,
                "deal_id": self.deal.id,
                "cost_id": response.data["id"],
            },
        )
        updated = self.client.patch(
            detail, {"status": DealCostLine.Status.COMMITTED}, format="json"
        )
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.data["collaborator_name"], "Kostas")
        self.assertEqual(updated.data["service_name"], "Logo")
        self.assertEqual(updated.data["description"], "Logo design")
        self.assertEqual(updated.data["unit_cost"], "50.00")

        full_form_update = self.client.patch(
            detail,
            {
                "collaborator": self.collaborator.id,
                "collaborator_service": self.service.id,
                "service_name": "Logo",
                "description": "Logo design",
                "quantity": "3.00",
                "unit_cost": "50.00",
                "currency": "EUR",
                "status": DealCostLine.Status.PAID,
            },
            format="json",
        )
        self.assertEqual(full_form_update.status_code, status.HTTP_200_OK)
        self.assertEqual(full_form_update.data["collaborator_name"], "Kostas")
        self.assertEqual(full_form_update.data["service_name"], "Logo")
        self.assertEqual(full_form_update.data["description"], "Logo design")
        self.assertEqual(full_form_update.data["unit_cost"], "50.00")
        self.assertEqual(full_form_update.data["total_cost"], "150.00")

    def test_manual_cost_and_explicit_catalog_override(self):
        manual = self.create_cost(
            collaborator_service=None,
            service_name="Custom work",
            description="Extra concepts",
            unit_cost="200.00",
            currency="eur",
        )
        override = self.create_cost(unit_cost="75.00")
        self.assertEqual(manual.status_code, status.HTTP_201_CREATED)
        self.assertEqual(manual.data["currency"], "EUR")
        self.assertEqual(override.status_code, status.HTTP_201_CREATED)
        self.assertEqual(override.data["unit_cost"], "75.00")

    def test_currency_must_match_deal_without_fx_conversion(self):
        response = self.create_cost(currency="USD", unit_cost="50.00")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("currency", response.data)

    def test_deal_currency_cannot_change_while_cost_lines_exist(self):
        self.assertEqual(self.create_cost().status_code, status.HTTP_201_CREATED)
        response = self.client.patch(
            reverse(
                "deal-detail",
                kwargs={
                    "organization_id": self.organization.id,
                    "deal_id": self.deal.id,
                },
            ),
            {"currency": "USD"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("currency", response.data)
        self.deal.refresh_from_db()
        self.assertEqual(self.deal.currency, "EUR")

    def test_currency_must_be_three_ascii_letters(self):
        response = self.client.post(
            self.services_url(),
            {
                "collaborator": self.collaborator.id,
                "name": "Invalid currency",
                "default_cost": "10.00",
                "currency": "12",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("currency", response.data)

    def test_inactive_catalog_records_cannot_be_used_for_new_costs(self):
        self.collaborator.is_active = False
        self.collaborator.save()
        new_service = self.client.post(
            self.services_url(),
            {
                "collaborator": self.collaborator.id,
                "name": "Blocked",
                "default_cost": "10.00",
                "currency": "EUR",
            },
            format="json",
        )
        new_cost = self.create_cost()
        self.assertEqual(new_service.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(new_cost.status_code, status.HTTP_400_BAD_REQUEST)

        self.collaborator.is_active = True
        self.collaborator.save()
        self.service.is_active = False
        self.service.save()
        inactive_service_cost = self.create_cost()
        self.assertEqual(inactive_service_cost.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_amounts_are_rejected_by_api_and_database(self):
        negative = self.create_cost(unit_cost="-1.00")
        zero_quantity = self.create_cost(quantity="0.00")
        self.assertEqual(negative.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(zero_quantity.status_code, status.HTTP_400_BAD_REQUEST)
        with self.assertRaises(IntegrityError), transaction.atomic():
            DealCostLine.objects.create(
                organization=self.organization,
                deal=self.deal,
                collaborator=self.collaborator,
                collaborator_name="Kostas",
                service_name="Invalid",
                quantity=0,
                unit_cost=1,
                currency="EUR",
            )

    def test_cross_tenant_collaborator_service_and_deal_are_rejected(self):
        other_company = Company.objects.create(
            organization=self.other_organization, name="Hidden company"
        )
        other_deal = Deal.objects.create(
            organization=self.other_organization,
            company=other_company,
            title="Hidden deal",
            currency="EUR",
        )
        other_collaborator = ExternalCollaborator.objects.create(
            organization=self.other_organization, name="Hidden collaborator"
        )
        other_service = CollaboratorService.objects.create(
            organization=self.other_organization,
            collaborator=other_collaborator,
            name="Hidden service",
            default_cost="10.00",
        )
        collaborator_response = self.create_cost(
            collaborator=other_collaborator.id,
            collaborator_service=None,
            service_name="Hidden",
            unit_cost="10.00",
            currency="EUR",
        )
        service_response = self.create_cost(collaborator_service=other_service.id)
        hidden_deal_response = self.client.get(self.costs_url(other_deal))
        hidden_collaborator_detail = self.client.get(
            reverse(
                "external-collaborator-detail",
                kwargs={
                    "organization_id": self.organization.id,
                    "collaborator_id": other_collaborator.id,
                },
            )
        )
        hidden_service_detail = self.client.get(
            reverse(
                "collaborator-service-detail",
                kwargs={
                    "organization_id": self.organization.id,
                    "service_id": other_service.id,
                },
            )
        )
        foreign_service_create = self.client.post(
            self.services_url(),
            {
                "collaborator": other_collaborator.id,
                "name": "Cross tenant",
                "default_cost": "10.00",
                "currency": "EUR",
            },
            format="json",
        )
        self.assertEqual(collaborator_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(service_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(hidden_deal_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(hidden_collaborator_detail.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(hidden_service_detail.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(foreign_service_create.status_code, status.HTTP_400_BAD_REQUEST)

    def test_service_must_belong_to_selected_collaborator(self):
        another = ExternalCollaborator.objects.create(
            organization=self.organization, name="Another"
        )
        response = self.create_cost(collaborator=another.id)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("collaborator_service", response.data)

    def test_cost_detail_is_nested_under_its_deal_and_supports_update_delete(self):
        created = self.create_cost()
        line_id = created.data["id"]
        detail = reverse(
            "deal-cost-detail",
            kwargs={
                "organization_id": self.organization.id,
                "deal_id": self.deal.id,
                "cost_id": line_id,
            },
        )
        updated = self.client.patch(
            detail, {"status": DealCostLine.Status.COMMITTED}, format="json"
        )
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.assertEqual(updated.data["status"], DealCostLine.Status.COMMITTED)

        another_deal = Deal.objects.create(
            organization=self.organization,
            company=self.company,
            title="Another",
            currency="EUR",
        )
        wrong_detail = reverse(
            "deal-cost-detail",
            kwargs={
                "organization_id": self.organization.id,
                "deal_id": another_deal.id,
                "cost_id": line_id,
            },
        )
        self.assertEqual(self.client.get(wrong_detail).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.delete(detail).status_code, status.HTTP_204_NO_CONTENT)

    def test_profitability_uses_net_revenue_and_excludes_cancelled_costs(self):
        self.deal.value = Decimal("620.00")
        self.deal.amount_includes_tax = True
        self.deal.save()
        self.create_cost(unit_cost="100.00", status=DealCostLine.Status.ESTIMATED)
        self.create_cost(unit_cost="200.00", status=DealCostLine.Status.COMMITTED)
        self.create_cost(unit_cost="50.00", status=DealCostLine.Status.PAID)
        self.create_cost(unit_cost="999.00", status=DealCostLine.Status.CANCELLED)

        response = self.client.get(
            reverse(
                "deal-profitability",
                kwargs={"organization_id": self.organization.id, "deal_id": self.deal.id},
            )
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["net_revenue"], "500.00")
        self.assertEqual(response.data["estimated_cost_total"], "350.00")
        self.assertEqual(response.data["committed_cost_total"], "250.00")
        self.assertEqual(response.data["estimated_gross_profit"], "150.00")
        self.assertEqual(response.data["estimated_margin_percent"], "30.00")

    def test_zero_revenue_has_null_margin(self):
        self.deal.value = 0
        self.deal.save()
        response = self.client.get(
            reverse(
                "deal-profitability",
                kwargs={"organization_id": self.organization.id, "deal_id": self.deal.id},
            )
        )
        self.assertIsNone(response.data["estimated_margin_percent"])

    def test_viewer_can_read_but_cannot_write(self):
        self.client.force_authenticate(self.viewer)
        self.assertEqual(self.client.get(self.collaborators_url()).status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.client.post(self.collaborators_url(), {"name": "Blocked"}, format="json").status_code,
            status.HTTP_404_NOT_FOUND,
        )
        self.assertEqual(self.client.get(self.costs_url()).status_code, status.HTTP_200_OK)
        self.assertEqual(
            self.client.post(
                self.costs_url(),
                {"collaborator": self.collaborator.id},
                format="json",
            ).status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_workspace_export_includes_costing_records_and_snapshots(self):
        created = self.create_cost()
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        exported = build_workspace_data_export(self.organization)
        self.assertEqual(exported["external_collaborators"][0]["name"], "Kostas")
        self.assertEqual(exported["collaborator_services"][0]["name"], "Logo")
        self.assertEqual(exported["deal_cost_lines"][0]["service_name"], "Logo")

