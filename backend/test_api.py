import json
import urllib.request
import urllib.error

url = 'http://127.0.0.1:8000/api/inventory/sales/?shop=usman'
data = {
    "customer_name": "test", 
    "total_amount": 0, 
    "paid_amount": 0, 
    "balance_amount": 0, 
    "sale_type": "Cash", 
    "status": "Paid", 
    "date": "2026-04-06", 
    "items": [{"roll": 2, "length": 1, "width": 12, "unit_price": 100, "subtotal": 100}]
}
req = urllib.request.Request(url, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'})
try:
    response = urllib.request.urlopen(req)
    print(response.read().decode())
except urllib.error.HTTPError as e:
    print(e.read().decode())
