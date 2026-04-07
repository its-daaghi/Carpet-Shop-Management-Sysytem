import threading

_thread_locals = threading.local()

def set_current_shop(shop_name):
    setattr(_thread_locals, 'current_shop', shop_name)

def get_current_shop():
    return getattr(_thread_locals, 'current_shop', None)

def clear_current_shop():
    if hasattr(_thread_locals, 'current_shop'):
        delattr(_thread_locals, 'current_shop')
