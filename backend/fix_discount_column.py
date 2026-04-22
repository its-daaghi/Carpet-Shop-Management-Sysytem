import sqlite3

for db in ['db_usman.sqlite3', 'db_hanif.sqlite3', 'db.sqlite3']:
    conn = sqlite3.connect(db)
    cur = conn.cursor()
    cur.execute('PRAGMA table_info(inventory_sale)')
    cols = [r[1] for r in cur.fetchall()]
    has_discount = 'discount' in cols
    print(f'{db}: has discount = {has_discount}')
    if not has_discount:
        cur.execute('ALTER TABLE inventory_sale ADD COLUMN discount real NOT NULL DEFAULT 0')
        conn.commit()
        print(f'  --> Added discount column to {db}')
    conn.close()

print('Done.')
