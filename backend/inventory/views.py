from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from .models import ProductType, Design, Color, Roll, Employee, SalaryPayment, Expense, Factory, FactoryPayment, Sale, SaleItem, AdditionalStock
from .serializers import ProductTypeSerializer, DesignSerializer, ColorSerializer, RollSerializer, EmployeeSerializer, SalaryPaymentSerializer, ExpenseSerializer, FactorySerializer, FactoryPaymentSerializer, SaleSerializer, SaleItemSerializer, AdditionalStockSerializer

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

class AdditionalStockViewSet(viewsets.ModelViewSet):
    queryset = AdditionalStock.objects.all()
    serializer_class = AdditionalStockSerializer

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

    @method_decorator(csrf_exempt)
    @action(detail=True, methods=['post'])
    def add_additional_stock(self, request, pk=None):
        try:
            sale = self.get_object()
            stock_type = request.data.get('stock_type', '').strip()
            design = request.data.get('design', '').strip()
            color = request.data.get('color', '').strip()
            length = float(request.data.get('length', 0) or 0)
            width = float(request.data.get('width', 0) or 0)
            total_payment = float(request.data.get('total_payment', 0) or 0)

            from datetime import date
            additional_stock = AdditionalStock.objects.create(
                sale=sale,
                stock_type=stock_type,
                design=design,
                color=color,
                length=length,
                width=width,
                total_payment=total_payment,
                date=date.today().isoformat()
            )

            serializer = AdditionalStockSerializer(additional_stock)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @method_decorator(csrf_exempt)
    @action(detail=True, methods=['post'])
    def return_sale(self, request, pk=None):
        try:
            sale = self.get_object()

            if sale.status == 'Returned':
                return Response({'error': 'This sale has already been returned.'}, status=status.HTTP_400_BAD_REQUEST)

            # Restore inventory for each sale item
            for item in sale.items.all():
                roll = item.roll
                if roll:
                    if roll.length > 0 or item.length > 0:
                        # Area/length-based roll — add length back
                        roll.length = round(float(roll.length) + float(item.length), 4)
                    else:
                        # Piece/quantity-based roll — add quantity back
                        roll.quantity = int(roll.quantity) + int(item.length or 1)

                    # If it was sold, put it back in stock
                    if roll.status == 'Sold':
                        roll.status = 'In Stock'
                    roll.save()

            sale.status = 'Returned'
            sale.save()

            serializer = self.get_serializer(sale)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class SaleItemViewSet(viewsets.ModelViewSet):
    queryset = SaleItem.objects.all()
    serializer_class = SaleItemSerializer
