from django.contrib import admin

from .models import Charge, CustomerSubscription, Payment, ServiceCatalogItem

admin.site.register((ServiceCatalogItem, CustomerSubscription, Charge, Payment))
