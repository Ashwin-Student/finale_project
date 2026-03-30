import mysql.connector

def create_tables():
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="Ashvin@123",
            database="crop_project"
        )
        cursor = conn.cursor()
        
        # Seed Batches table for tracking count and tracing
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS seed_batches (
                id INT AUTO_INCREMENT PRIMARY KEY,
                batch_id VARCHAR(255) UNIQUE NOT NULL,
                seed_name VARCHAR(255),
                seed_variety VARCHAR(255),
                crop_type VARCHAR(255),
                manufacturer_id INT,
                status VARCHAR(50) DEFAULT 'Manufactured',
                warehouse_location VARCHAR(255),
                transport_mode VARCHAR(50),
                vehicle_number VARCHAR(100),
                selling_price DECIMAL(10, 2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS blockchain_transactions (
                blockchain_id INT AUTO_INCREMENT PRIMARY KEY,
                transaction_id VARCHAR(255),
                tx_hash VARCHAR(255),
                block_number BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS traceability_log (
                log_id INT AUTO_INCREMENT PRIMARY KEY,
                product_id VARCHAR(255),
                stage VARCHAR(100),
                location VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        print("Tables 'seed_batches', 'blockchain_transactions', and 'traceability_log' verified/created.")
        conn.commit()
        conn.close()
    except Exception as e:
        print("Error creating tables:", e)

if __name__ == "__main__":
    create_tables()
