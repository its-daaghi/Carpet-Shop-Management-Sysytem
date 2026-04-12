from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0015_salepaymenthistory'),
    ]

    operations = [
        migrations.CreateModel(
            name='AdditionalStock',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('stock_type', models.CharField(max_length=200)),
                ('design', models.CharField(default='', max_length=200)),
                ('color', models.CharField(default='', max_length=200)),
                ('length', models.FloatField(default=0)),
                ('width', models.FloatField(default=0)),
                ('total_payment', models.FloatField()),
                ('date', models.CharField(max_length=50)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('sale', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='additional_stocks', to='inventory.sale')),
            ],
        ),
    ]
