from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductTypeViewSet, DesignViewSet, ColorViewSet, RollViewSet, EmployeeViewSet, SalaryPaymentViewSet, ExpenseViewSet, FactoryViewSet, FactoryPaymentViewSet, SaleViewSet, SaleItemViewSet

router = DefaultRouter()
router.register(r'types', ProductTypeViewSet, basename='producttype')
router.register(r'designs', DesignViewSet, basename='design')
router.register(r'colors', ColorViewSet, basename='color')
router.register(r'rolls', RollViewSet, basename='roll')
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'payments', SalaryPaymentViewSet, basename='salarypayment')
router.register(r'expenses', ExpenseViewSet, basename='expense')
router.register(r'factories', FactoryViewSet, basename='factory')
router.register(r'factory-payments', FactoryPaymentViewSet, basename='factorypayment')
router.register(r'sales', SaleViewSet, basename='sale')
router.register(r'sale-items', SaleItemViewSet, basename='saleitem')

urlpatterns = [
    path('', include(router.urls)),
]
