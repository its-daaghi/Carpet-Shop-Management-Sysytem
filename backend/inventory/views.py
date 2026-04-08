from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from .models import ProductType, Design, Color, Roll, Employee, SalaryPayment, Expense, Factory, FactoryPayment, Sale, SaleItem
from .serializers import ProductTypeSerializer, DesignSerializer, ColorSerializer, RollSerializer, EmployeeSerializer, SalaryPaymentSerializer, ExpenseSerializer, FactorySerializer, FactoryPaymentSerializer, SaleSerializer, SaleItemSerializer

class ProductTypeViewSet(viewsets.ModelViewSet):
    queryset = ProductType.objects.all()
    serializer_class = ProductTypeSerializer

class DesignViewSet(viewsets.ModelViewSet):
    queryset = Design.objects.all()
    serializer_class = DesignSerializer

class ColorViewSet(viewsets.ModelViewSet):
    queryset = Color.objects.all()
    serializer_class = ColorSerializer

class RollViewSet(viewsets.ModelViewSet):
    queryset = Roll.objects.all()
    serializer_class = RollSerializer

class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.all()
    serializer_class = EmployeeSerializer

class SalaryPaymentViewSet(viewsets.ModelViewSet):
    queryset = SalaryPayment.objects.all()
    serializer_class = SalaryPaymentSerializer

class ExpenseViewSet(viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer

class FactoryViewSet(viewsets.ModelViewSet):
    queryset = Factory.objects.all()
    serializer_class = FactorySerializer

class FactoryPaymentViewSet(viewsets.ModelViewSet):
    queryset = FactoryPayment.objects.all()
    serializer_class = FactoryPaymentSerializer

class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.all()
    serializer_class = SaleSerializer

    @method_decorator(csrf_exempt)
    @action(detail=True, methods=['post'])
    def add_payment(self, request, pk=None):
        try:
            sale = self.get_object()
            amount = float(request.data.get('amount', 0))
            
            if amount <= 0:
                return Response({'error': 'Amount must be greater than zero'}, status=status.HTTP_400_BAD_REQUEST)
                
            from datetime import date
            from .models import SalePaymentHistory
            SalePaymentHistory.objects.create(
                sale=sale,
                amount=amount,
                date=date.today().isoformat()
            )
            
            sale.paid_amount = round(sale.paid_amount + amount, 2)
            sale.balance_amount = round(max(0, sale.total_amount - sale.paid_amount), 2)
            
            if sale.balance_amount <= 0:
                sale.status = 'Paid'
            else:
                sale.status = 'Partial'
                
            sale.save()
            return Response({
                'id': sale.id,
                'paid_amount': sale.paid_amount,
                'balance_amount': sale.balance_amount,
                'status': sale.status,
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SaleItemViewSet(viewsets.ModelViewSet):
    queryset = SaleItem.objects.all()
    serializer_class = SaleItemSerializer
