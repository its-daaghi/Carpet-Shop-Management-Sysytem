from .shop_context import set_current_shop, clear_current_shop

class ShopDatabaseMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Extract shop from query parameters or headers
        shop = request.GET.get('shop')
        if shop:
            set_current_shop(shop.lower())
        
        response = self.get_response(request)
        
        clear_current_shop()
        return response
