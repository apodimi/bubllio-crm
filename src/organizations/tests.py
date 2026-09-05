from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Organization, OrganizationMembership


User = get_user_model()


class OrganizationAccessTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner", password="test-pass")
        self.other_user = User.objects.create_user(username="other", password="test-pass")
        self.organization = Organization.objects.create(name="Nerds Lab", slug="nerds-lab")
        self.owner_membership = OrganizationMembership.objects.create(
            organization=self.organization,
            user=self.owner,
            role=OrganizationMembership.Role.OWNER,
        )

    def test_anonymous_requests_are_rejected(self):
        response = self.client.get(reverse("organization-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_creating_organization_makes_request_user_owner(self):
        self.client.force_authenticate(self.other_user)
        response = self.client.post(
            reverse("organization-list"),
            {"name": "Acme", "slug": "acme"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        membership = OrganizationMembership.objects.get(
            organization_id=response.data["id"], user=self.other_user
        )
        self.assertEqual(membership.role, OrganizationMembership.Role.OWNER)
        self.assertEqual(response.data["current_user_role"], "owner")

    def test_list_contains_only_users_organizations(self):
        hidden = Organization.objects.create(name="Hidden", slug="hidden")
        OrganizationMembership.objects.create(
            organization=hidden,
            user=self.other_user,
            role=OrganizationMembership.Role.OWNER,
        )
        self.client.force_authenticate(self.owner)
        response = self.client.get(reverse("organization-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in response.data], [str(self.organization.id)])

    def test_only_owner_can_delete_organization(self):
        admin = User.objects.create_user(username="admin")
        OrganizationMembership.objects.create(
            organization=self.organization,
            user=admin,
            role=OrganizationMembership.Role.ADMIN,
        )
        url = reverse("organization-detail", kwargs={"organization_id": self.organization.id})
        self.client.force_authenticate(admin)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_404_NOT_FOUND)
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_204_NO_CONTENT)


class MembershipManagementTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username="owner")
        self.admin = User.objects.create_user(username="admin")
        self.member = User.objects.create_user(username="member")
        self.new_user = User.objects.create_user(username="new-user")
        self.organization = Organization.objects.create(name="Nerds Lab", slug="nerds-lab")
        self.owner_membership = OrganizationMembership.objects.create(
            organization=self.organization,
            user=self.owner,
            role=OrganizationMembership.Role.OWNER,
        )
        self.admin_membership = OrganizationMembership.objects.create(
            organization=self.organization,
            user=self.admin,
            role=OrganizationMembership.Role.ADMIN,
        )
        self.member_membership = OrganizationMembership.objects.create(
            organization=self.organization,
            user=self.member,
            role=OrganizationMembership.Role.MEMBER,
        )

    def list_url(self):
        return reverse(
            "organization-membership-list",
            kwargs={"organization_id": self.organization.id},
        )

    def detail_url(self, membership):
        return reverse(
            "organization-membership-detail",
            kwargs={"organization_id": self.organization.id, "membership_id": membership.id},
        )

    def test_member_cannot_view_membership_list(self):
        self.client.force_authenticate(self.member)
        self.assertEqual(self.client.get(self.list_url()).status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_can_add_member(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post(
            self.list_url(), {"user_id": self.new_user.id, "role": "viewer"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(
            OrganizationMembership.objects.filter(
                organization=self.organization,
                user=self.new_user,
                role=OrganizationMembership.Role.VIEWER,
            ).exists()
        )

    def test_admin_cannot_add_another_admin(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            self.list_url(), {"user_id": self.new_user.id, "role": "admin"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_transfer_ownership(self):
        self.client.force_authenticate(self.owner)
        response = self.client.patch(
            self.detail_url(self.member_membership), {"role": "owner"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.owner_membership.refresh_from_db()
        self.member_membership.refresh_from_db()
        self.assertEqual(self.owner_membership.role, OrganizationMembership.Role.ADMIN)
        self.assertEqual(self.member_membership.role, OrganizationMembership.Role.OWNER)

    def test_admin_cannot_change_or_remove_another_admin(self):
        second_admin = User.objects.create_user(username="second-admin")
        second_membership = OrganizationMembership.objects.create(
            organization=self.organization,
            user=second_admin,
            role=OrganizationMembership.Role.ADMIN,
        )
        self.client.force_authenticate(self.admin)
        changed = self.client.patch(
            self.detail_url(second_membership), {"role": "member"}, format="json"
        )
        removed = self.client.delete(self.detail_url(second_membership))
        self.assertEqual(changed.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(removed.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_cannot_be_removed_before_transfer(self):
        self.client.force_authenticate(self.owner)
        response = self.client.delete(self.detail_url(self.owner_membership))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
