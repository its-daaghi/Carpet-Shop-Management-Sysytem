from rest_framework import serializers
from .models import ProductType, Design, Color, Roll, Employee, SalaryPayment, Expense, Factory, FactoryPayment, Sale, SaleItem, SalePaymentHistory, AdditionalStock

class ColorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Color
        fields = '__all__'

class DesignSerializer(serializers.ModelSerializer):
    colors = ColorSerializer(many=True, read_only=True)
    product_type_name = serializers.ReadOnlyField()
    class Meta:
        model = Design
        fields = ['id', 'product_type', 'product_type_name', 'name', 'colors', 'created_at']

class ProductTypeSerializer(serializers.ModelSerializer):
    designs = DesignSerializer(many=True, read_only=True)
    class Meta:
        model = ProductType
        fields = '__all__'

class RollSerializer(serializers.ModelSerializer):
    class Meta:
        model = Roll
        fields = '__all__'

class SalaryPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryPayment
        fields = '__all__'

class EmployeeSerializer(serializers.ModelSerializer):
    payments = SalaryPaymentSerializer(many=True, read_only=True)
    class Meta:
        model = Employee
        fields = '__all__'

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'

class FactoryPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = FactoryPayment
        fields = '__all__'

class FactorySerializer(serializers.ModelSerializer):
    payments = FactoryPaymentSerializer(many=True, read_only=True)
    rolls = RollSerializer(many=True, read_only=True)
    total_goods_value = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    balance_due = serializers.SerializerMethodField()

    class Meta:
        model = Factory
        fields = '__all__'

    def get_total_goods_value(self, obj):
        return round(sum(r.total_price or 0 for r in obj.rolls.all()), 2)

    def get_total_paid(self, obj):
        total = 0
        for p in obj.payments.all():
            try:
                amount_str = str(p.amount).replace('PKR', '').replace(',', '').strip()
                total += float(amount_str)
            except (ValueError, TypeError):
                pass
        return round(total, 2)

    def get_balance_due(self, obj):
        goods = self.get_total_goods_value(obj)
        paid = self.get_total_paid(obj)
        return round(max(0, goods - paid), 2)

class SaleItemSerializer(serializers.ModelSerializer):
    roll_id_str = serializers.CharField(source='roll.roll_id', read_only=True, default='')
    roll_product_type = serializers.CharField(source='roll.product_type', read_only=True, default='')
    roll_design = serializers.CharField(source='roll.design', read_only=True, default='')
    roll_color = serializers.CharField(source='roll.color', read_only=True, default='')

    class Meta:
        model = SaleItem
        fields = '__all__'
        read_only_fields = ['sale']

class SalePaymentHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SalePaymentHistory
        fields = '__all__'
        read_only_fields = ['sale']

class AdditionalStockSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdditionalStock
        fields = '__all__'
        read_only_fields = ['sale']

class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True)
    payment_history = SalePaymentHistorySerializer(many=True, read_only=True)
    additional_stocks = AdditionalStockSerializer(many=True, read_only=True)

    class Meta:
        model = Sale
        fields = '__all__'

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        sale = Sale.objects.create(**validated_data)
        
        if getattr(sale, 'paid_amount', 0) > 0:
            SalePaymentHistory.objects.create(
                sale=sale,
                amount=sale.paid_amount,
                date=sale.date
            )

        for item_data in items_data:
            roll = item_data.get('roll')
            length = item_data.get('length', 0.0)
            if roll:
                if roll.length > 0:
                    roll.length = max(0.0, float(roll.length) - float(length))
                    if roll.length == 0.0:
                        roll.status = 'Sold'
                else:
                    roll.quantity = max(0, int(roll.quantity) - int(length))
                    if roll.quantity == 0:
                        roll.status = 'Sold'
                roll.save()
            SaleItem.objects.create(sale=sale, **item_data)
        return sale
