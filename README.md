# Professional Carpet Shop Management System

A robust full-stack application designed for managing inventory, sales, factory payments, and expenses for a carpet business.

## Features

- **Inventory Tracking**: Manage rolls and pieces with detailed dimensions (Length x Width).
- **Sales & Billing**: Area-based and piece-based billing options.
- **Factory Management**: Track purchases and payments to different factories.
- **Expense Tracking**: Log and categorize business expenses.
- **Employee Management**: Handle staff salaries and payments.
- **Analytics**: Overview of total sales, profits, and stock levels.

## Tech Stack

- **Frontend**: Next.js, Framer Motion, Tailwind CSS, Lucide Icons.
- **Backend**: Django, Django REST Framework.
- **Database**: Multi-database support for different shops (SQLite).

## Setup

### Backend
1. Create a virtual environment: `python -m venv venv`
2. Activate it: `.\venv\Scripts\activate`
3. Install dependencies: `pip install -r requirements.txt` (Make sure to create this)
4. Run migrations: `python manage.py migrate`
5. Start the server: `python manage.py runserver`

### Frontend
1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
