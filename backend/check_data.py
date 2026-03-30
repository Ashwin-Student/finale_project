import mysql.connector

def check_counts():
    try:
        conn = mysql.connector.connect(
            host="",
            user="",
            password="",
            database=""
        )
        cursor = conn.cursor()
        
        tables = ["users", "soil_data", "predictions", "predicted_crops", "seed_batches"]
        print("--- Database Record Counts ---")
        for table in tables:
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"{table}: {count} records")
            except Exception as e:
                print(f"{table}: Error querying table ({e})")
        
        conn.close()
    except Exception as e:
        print("Database Connection Error:", e)

if __name__ == "__main__":
    check_counts()
