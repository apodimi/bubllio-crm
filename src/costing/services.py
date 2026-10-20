from decimal import Decimal, ROUND_HALF_UP

from django.db.models import DecimalField, ExpressionWrapper, F, Sum
from django.db.models.functions import Coalesce

from .models import DealCostLine


MONEY_FIELD = DecimalField(max_digits=26, decimal_places=2)


def deal_profitability(deal):
    active_lines = deal.cost_lines.exclude(status=DealCostLine.Status.CANCELLED)
    line_total = ExpressionWrapper(F("quantity") * F("unit_cost"), output_field=MONEY_FIELD)
    zero = Decimal("0.00")
    estimated_cost = active_lines.aggregate(
        total=Coalesce(Sum(line_total), zero, output_field=MONEY_FIELD)
    )["total"].quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    committed_cost = active_lines.filter(
        status__in=(DealCostLine.Status.COMMITTED, DealCostLine.Status.PAID)
    ).aggregate(
        total=Coalesce(Sum(line_total), zero, output_field=MONEY_FIELD)
    )["total"].quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    revenue = deal.net_value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    estimated_profit = revenue - estimated_cost
    margin = None
    if revenue != 0:
        margin = (estimated_profit * Decimal("100") / revenue).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
    return {
        "deal": deal.id,
        "currency": deal.currency,
        "net_revenue": revenue,
        "estimated_cost_total": estimated_cost,
        "committed_cost_total": committed_cost,
        "estimated_gross_profit": estimated_profit,
        "estimated_margin_percent": margin,
    }

