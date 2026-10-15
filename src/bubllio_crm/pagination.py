from rest_framework.exceptions import ValidationError
from rest_framework.response import Response


def collection_response(request, queryset, serializer_class):
    """Opt-in bounded pages; preserve legacy array responses for existing clients."""
    if "page" not in request.query_params:
        return Response(serializer_class(queryset, many=True).data)
    try:
        page = int(request.query_params["page"])
        size = int(request.query_params.get("page_size", 50))
        if page < 1 or not 1 <= size <= 100:
            raise ValueError
    except (TypeError, ValueError):
        raise ValidationError({"page": "Use page >= 1 and page_size between 1 and 100."})
    count = queryset.count()
    offset = (page - 1) * size
    return Response({
        "count": count,
        "results": serializer_class(queryset[offset:offset + size], many=True).data,
    })
