from django.db import models

class ProductType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    category = models.CharField(max_length=50, default='carpet')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class Design(models.Model):
    product_type = models.ForeignKey(ProductType, related_name='designs', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def product_type_name(self):
        return self.product_type.name

    class Meta:
        unique_together = ('product_type', 'name')

    def __str__(self):
        return f"{self.product_type.name} - {self.name}"

class Color(models.Model):
    design = models.ForeignKey(Design, related_name='colors', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('design', 'name')

    def __str__(self):
        return f"{self.design.name} - {self.name}"

class Roll(models.Model):
    roll_id = models.CharField(max_length=100) # Removed unique=True to allow bulk categories
    category = models.CharField(max_length=50, default='carpet')
    product_type = models.CharField(max_length=100) 
    design = models.CharField(max_length=100)
    color = models.CharField(max_length=100)
    length = models.FloatField(default=0) # Default 0 as pieces might not have length
    width = models.FloatField(default=0)
    quantity = models.IntegerField(default=1) # New field for bulk stock
    status = models.CharField(max_length=50, default='In Stock')
    factory = models.ForeignKey('Factory', related_name='rolls', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.roll_id

class Employee(models.Model):
    name = models.CharField(max_length=200)
    mobile = models.CharField(max_length=20)
    cnic = models.CharField(max_length=20)
    role = models.CharField(max_length=100, default='Staff')
    image = models.TextField(null=True, blank=True) # Storing base64 for now as per frontend
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class SalaryPayment(models.Model):
    employee = models.ForeignKey(Employee, related_name='payments', on_delete=models.CASCADE)
    amount = models.CharField(max_length=50) # e.g. "PKR 5000"
    remarks = models.TextField(default='No remarks')
    date = models.CharField(max_length=50) # Matching frontend format
    month = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee.name} - {self.amount}"

class Expense(models.Model):
    amount = models.CharField(max_length=50) # To allow inputs like "PKR 5000" if user prefers, matching Salary
    description = models.TextField()
    date = models.CharField(max_length=50) # String to match frontend YYYY-MM-DD
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.date} - {self.amount}"

class Factory(models.Model):
    name = models.CharField(max_length=200)
    mobile = models.CharField(max_length=20)
    address = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class FactoryPayment(models.Model):
    factory = models.ForeignKey(Factory, related_name='payments', on_delete=models.CASCADE)
    amount = models.CharField(max_length=50) # Matching SalaryPayment pattern
    date = models.CharField(max_length=50) 
    month = models.CharField(max_length=50)
    remarks = models.TextField(default='No remarks')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.factory.name} - {self.amount}"

class Sale(models.Model):
    SALE_TYPES = [
        ('Cash', 'Cash'),
        ('Advance', 'Advance'),
        ('Udhar', 'Udhar'),
    ]
    STATUS_CHOICES = [
        ('Paid', 'Paid'),
        ('Partial', 'Partial'),
        ('Unpaid', 'Unpaid'),
    ]
    
    customer_name = models.CharField(max_length=200, default='Walk-in Customer')
    customer_mobile = models.CharField(max_length=20, null=True, blank=True)
    total_amount = models.FloatField(default=0)
    paid_amount = models.FloatField(default=0)
    balance_amount = models.FloatField(default=0)
    sale_type = models.CharField(max_length=20, choices=SALE_TYPES, default='Cash')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Paid')
    date = models.CharField(max_length=50) # Matching frontend format YYYY-MM-DD
    remarks = models.TextField(default='No remarks')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Sale {self.id} - {self.customer_name} ({self.sale_type})"

class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, related_name='items', on_delete=models.CASCADE)
    roll = models.ForeignKey(Roll, on_delete=models.SET_NULL, null=True)
    length = models.FloatField(default=0.0)
    width = models.FloatField(default=12.0)
    unit_price = models.FloatField()
    subtotal = models.FloatField()

    def __str__(self):
        return f"Item for Sale {self.sale.id}"
