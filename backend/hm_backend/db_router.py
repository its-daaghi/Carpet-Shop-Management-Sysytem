from .shop_context import get_current_shop

class ShopRouter:
    """
    A router to control all database operations on models for different shops.
    """
    def db_for_read(self, model, **hints):
        shop = get_current_shop()
        if shop in ['usman', 'hanif']:
            return shop
        return 'default'

    def db_for_write(self, model, **hints):
        shop = get_current_shop()
        if shop in ['usman', 'hanif']:
            return shop
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        return True
