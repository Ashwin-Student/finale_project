import mysql.connector

try:
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="Ashvin@123",
        database="crop_project"
    )
    cursor = conn.cursor()
    
    # Check if password column exists
    cursor.execute("DESCRIBE users")
    columns = [col[0] for col in cursor.fetchall()]
    
    if 'password' not in columns:
        print("Adding password column to users table...")
        cursor.execute("ALTER TABLE users ADD COLUMN password VARCHAR(255) AFTER email")
        conn.commit()
        print("Column added successfully.")
    else:
        print("Password column already exists.")
    
    # Set a default password for the test user
    print("Updating password for ashwin@example.com...")
    cursor.execute("UPDATE users SET password='password123' WHERE email='ashwin@example.com'")
    conn.commit()
    print("Password updated successfully.")
    
    conn.commit()
    cursor.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
