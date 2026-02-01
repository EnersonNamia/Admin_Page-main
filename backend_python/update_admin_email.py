"""Update admin email and list users"""
import psycopg2
from psycopg2.extras import RealDictCursor

conn = psycopg2.connect(
    host="localhost",
    database="coursepro_db",
    user="postgres",
    password="admin123",
    port=5432
)

cursor = conn.cursor(cursor_factory=RealDictCursor)

# List current users
print("=" * 60)
print("CURRENT USERS:")
print("=" * 60)
cursor.execute("SELECT user_id, username, email, is_active FROM users ORDER BY user_id LIMIT 20")
users = cursor.fetchall()
for user in users:
    print(f"  ID: {user['user_id']}, Username: {user['username']}, Email: {user['email']}, Active: {user['is_active']}")

# Update admin email (usually user_id=1 or the first admin)
new_email = "namianamia77@gmail.com"
admin_user_id = 49  # Updated to correct user ID

print("\n" + "=" * 60)
print(f"UPDATING USER ID {admin_user_id} EMAIL TO: {new_email}")
print("=" * 60)

cursor.execute(
    "UPDATE users SET email = %s WHERE user_id = %s RETURNING user_id, username, email",
    (new_email, admin_user_id)
)
updated = cursor.fetchone()
conn.commit()

if updated:
    print(f"✅ Updated successfully!")
    print(f"   User ID: {updated['user_id']}")
    print(f"   Username: {updated['username']}")
    print(f"   New Email: {updated['email']}")
else:
    print("❌ No user found with that ID")

cursor.close()
conn.close()
