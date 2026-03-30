# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from pdf_utils import extract_text_from_pdf, parse_soil_data_from_text, extract_data_multimodal

app = Flask(__name__)
CORS(app)

# ----- DATABASE CONNECTION -----
def get_db_connection():
    connection = mysql.connector.connect(
        host="localhost",
        user="root",                # replace with your MySQL username
        password="Ashvin@123",   # replace with your MySQL password
        database="crop_project"
    )
    return connection

# ---------------------------------------
# ----- USERS ROUTES -----
# ---------------------------------------
@app.route('/users', methods=['GET'])
def get_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(users)

@app.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE user_id=%s", (user_id,))
    user = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify(user)

@app.route('/users', methods=['POST'])
def add_user():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO users (name, email, role, created_at) VALUES (%s,%s,%s,%s)",
        (data['name'], data['email'], data['role'], data['created_at'])
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "User added successfully!"})

@app.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE users SET name=%s, email=%s, role=%s, created_at=%s WHERE user_id=%s",
        (data['name'], data['email'], data['role'], data['created_at'], user_id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "User updated successfully!"})

@app.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Delete dependent data first
        cursor.execute("DELETE FROM predicted_crops WHERE prediction_id IN (SELECT prediction_id FROM predictions WHERE user_id=%s)", (user_id,))
        cursor.execute("DELETE FROM predictions WHERE user_id=%s", (user_id,))
        cursor.execute("DELETE FROM soil_data WHERE user_id=%s", (user_id,))
        cursor.execute("DELETE FROM products WHERE farmer_id=%s", (user_id,))
        cursor.execute("DELETE FROM transactions WHERE from_user=%s OR to_user=%s", (user_id, user_id))
        
        # Now delete the user
        cursor.execute("DELETE FROM users WHERE user_id=%s", (user_id,))
        
        conn.commit()
        return jsonify({"message": "User and related data deleted successfully!"})
    
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    
    finally:
        cursor.close()
        conn.close()

# ---------------------------------------
# ----- SOIL DATA ROUTES -----
# ---------------------------------------
@app.route('/soil_data', methods=['GET'])
def get_soil_data():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM soil_data")
    soil = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(soil)

@app.route('/soil_data/<int:soil_id>', methods=['GET'])
def get_soil(soil_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM soil_data WHERE soil_id=%s", (soil_id,))
    soil = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify(soil)

@app.route('/soil_data', methods=['POST'])
def add_soil():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if user exists first
        cursor.execute("SELECT * FROM users WHERE user_id=%s", (data['user_id'],))
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": f"user_id {data['user_id']} does not exist"}), 400

        # Insert soil data
        cursor.execute(
            "INSERT INTO soil_data (user_id, nitrogen, phosphorus, potassium, ph, moisture) VALUES (%s,%s,%s,%s,%s,%s)",
            (data['user_id'], data['nitrogen'], data['phosphorus'], data['potassium'], data['ph'], data['moisture'])
        )
        conn.commit()
        return jsonify({"message": "Soil data added successfully!"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()

@app.route('/soil_data/<int:soil_id>', methods=['PUT'])
def update_soil(soil_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE soil_data SET user_id=%s, nitrogen=%s, phosphorus=%s, potassium=%s, ph=%s, moisture=%s WHERE soil_id=%s",
        (data['user_id'], data['nitrogen'], data['phosphorus'], data['potassium'], data['ph'], data['moisture'], soil_id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Soil data updated successfully!"})

@app.route('/soil_data/<int:soil_id>', methods=['DELETE'])
def delete_soil(soil_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM soil_data WHERE soil_id=%s", (soil_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Soil data deleted successfully!"})

# ---------------------------------------
# ----- CROPS ROUTES -----
# ---------------------------------------
@app.route('/crops', methods=['GET'])
def get_crops():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM crops")
    crops = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(crops)

@app.route('/crops/<int:crop_id>', methods=['GET'])
def get_crop(crop_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM crops WHERE crop_id=%s", (crop_id,))
    crop = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify(crop)

@app.route('/crops', methods=['POST'])
def add_crop():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO crops (crop_name) VALUES (%s)",
        (data['crop_name'],)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Crop added successfully!"})

@app.route('/crops/<int:crop_id>', methods=['PUT'])
def update_crop(crop_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE crops SET crop_name=%s WHERE crop_id=%s",
        (data['crop_name'], crop_id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Crop updated successfully!"})

@app.route('/crops/<int:crop_id>', methods=['DELETE'])
def delete_crop(crop_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM crops WHERE crop_id=%s", (crop_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Crop deleted successfully!"})

# ---------------------------------------
# ----- PREDICTIONS ROUTES -----
# ---------------------------------------
@app.route('/predictions', methods=['GET'])
def get_predictions():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM predictions")
    predictions = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(predictions)

@app.route('/predictions/<int:prediction_id>', methods=['GET'])
def get_prediction(prediction_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM predictions WHERE prediction_id=%s", (prediction_id,))
    prediction = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify(prediction)

@app.route('/predictions', methods=['POST'])
def add_prediction():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Validate required fields
        required_fields = ['user_id', 'soil_id', 'location', 'season']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing field: {field}"}), 400

        # Check if user exists
        cursor.execute("SELECT * FROM users WHERE user_id = %s", (data['user_id'],))
        if not cursor.fetchone():
            return jsonify({"error": f"user_id {data['user_id']} does not exist"}), 400

        # Check if soil data exists
        cursor.execute("SELECT * FROM soil_data WHERE soil_id = %s", (data['soil_id'],))
        if not cursor.fetchone():
            return jsonify({"error": f"soil_id {data['soil_id']} does not exist"}), 400

        # Insert prediction
        cursor.execute(
            "INSERT INTO predictions (user_id, soil_id, location, season) VALUES (%s, %s, %s, %s)",
            (data['user_id'], data['soil_id'], data['location'], data['season'])
        )
        conn.commit()
        return jsonify({"message": "Prediction added successfully!"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()

@app.route('/predictions/<int:prediction_id>', methods=['PUT'])
def update_prediction(prediction_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE predictions SET user_id=%s, soil_id=%s, location=%s, season=%s WHERE prediction_id=%s",
        (data['user_id'], data['soil_id'], data['location'], data['season'], prediction_id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Prediction updated successfully!"})

@app.route('/predictions/<int:prediction_id>', methods=['DELETE'])
def delete_prediction(prediction_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM predictions WHERE prediction_id=%s", (prediction_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Prediction deleted successfully!"})

# ---------------------------------------
# ----- PREDICTED CROPS ROUTES -----
# ---------------------------------------
# ---------------------------------------
# PREDICTED CROPS ROUTES
# ---------------------------------------
@app.route('/predicted_crops', methods=['GET'])
def get_predicted_crops():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM predicted_crops")
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(data)

@app.route('/predicted_crops/<int:id>', methods=['GET'])
def get_predicted_crop(id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM predicted_crops WHERE id=%s", (id,))
    crop = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify(crop)

@app.route('/predicted_crops', methods=['POST'])
def add_predicted_crop():
    data = request.json

    # Check if JSON is sent
    if not data:
        return jsonify({"error": "JSON body is missing"}), 400

    # Validate required fields
    for field in ['prediction_id', 'crop_id', 'crop_rank']:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Check if prediction exists
        cursor.execute("SELECT * FROM predictions WHERE prediction_id = %s", (data['prediction_id'],))
        if not cursor.fetchone():
            return jsonify({"error": f"prediction_id {data['prediction_id']} does not exist"}), 400

        # Check if crop exists
        cursor.execute("SELECT * FROM crops WHERE crop_id = %s", (data['crop_id'],))
        if not cursor.fetchone():
            return jsonify({"error": f"crop_id {data['crop_id']} does not exist"}), 400

        # Insert into table
        cursor.execute(
            "INSERT INTO predicted_crops (prediction_id, crop_id, crop_rank) VALUES (%s, %s, %s)",
            (data['prediction_id'], data['crop_id'], data['crop_rank'])
        )
        conn.commit()
        return jsonify({"message": "Predicted crop added successfully!"})

    except mysql.connector.Error as err:
        conn.rollback()
        return jsonify({"error": f"MySQL Error: {err}"}), 500

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()

@app.route('/predicted_crops/<int:id>', methods=['PUT'])
def update_predicted_crop(id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()

    try:
        cursor.execute(
            "UPDATE predicted_crops SET prediction_id=%s, crop_id=%s, crop_rank=%s WHERE id=%s",
            (data['prediction_id'], data['crop_id'], data['crop_rank'], id)
        )
        conn.commit()
        return jsonify({"message": "Predicted crop updated successfully!"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()

@app.route('/predicted_crops/<int:id>', methods=['DELETE'])
def delete_predicted_crop(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM predicted_crops WHERE id=%s", (id,))
        conn.commit()
        return jsonify({"message": "Predicted crop deleted successfully!"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
# ---------------------------------------
# ----- PRODUCTS ROUTES -----
# ---------------------------------------
@app.route('/products', methods=['GET'])
def get_products():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM products")
    products = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(products)

@app.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM products WHERE product_id=%s", (product_id,))
    product = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify(product)

@app.route('/products', methods=['POST'])
def add_product():
    data = request.json
    if not data:
        return jsonify({"error": "JSON body is missing"}), 400

    for field in ['farmer_id', 'crop_id', 'quantity', 'price']:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Check if farmer exists
        cursor.execute("SELECT * FROM users WHERE user_id=%s", (data['farmer_id'],))
        if not cursor.fetchone():
            return jsonify({"error": f"farmer_id {data['farmer_id']} does not exist"}), 400

        # Check if crop exists
        cursor.execute("SELECT * FROM crops WHERE crop_id=%s", (data['crop_id'],))
        if not cursor.fetchone():
            return jsonify({"error": f"crop_id {data['crop_id']} does not exist"}), 400

        # Insert product
        cursor.execute(
            "INSERT INTO products (farmer_id, crop_id, quantity, price) VALUES (%s,%s,%s,%s)",
            (data['farmer_id'], data['crop_id'], data['quantity'], data['price'])
        )
        conn.commit()
        return jsonify({"message": "Product added successfully!"})

    except mysql.connector.Error as err:
        conn.rollback()
        return jsonify({"error": f"MySQL Error: {err}"}), 500

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()

@app.route('/products/<int:product_id>', methods=['PUT'])
def update_product(product_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE products SET farmer_id=%s, crop_id=%s, quantity=%s, price=%s WHERE product_id=%s",
        (data['farmer_id'], data['crop_id'], data['quantity'], data['price'], product_id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Product updated successfully!"})

@app.route('/products/<int:product_id>', methods=['DELETE'])
def delete_product(product_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM products WHERE product_id=%s", (product_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Product deleted successfully!"})

# ---------------------------------------
# ----- TRANSACTIONS ROUTES -----
# ---------------------------------------
@app.route('/transactions', methods=['GET'])
def get_transactions():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM transactions")  # Correct table name
    transactions = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(transactions)

@app.route('/transactions/<int:transaction_id>', methods=['GET'])
def get_transaction(transaction_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM transactions WHERE transaction_id=%s", (transaction_id,))
    transaction = cursor.fetchone()
    cursor.close()
    conn.close()
    if not transaction:
        return jsonify({"error": f"Transaction ID {transaction_id} not found"}), 404
    return jsonify(transaction)

@app.route('/transactions', methods=['POST'])
def add_transaction():
    data = request.json
    # Validate fields
    for field in ['product_id', 'from_user', 'to_user', 'quantity']:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Check if product exists
        cursor.execute("SELECT * FROM products WHERE product_id=%s", (data['product_id'],))
        if not cursor.fetchone():
            return jsonify({"error": f"product_id {data['product_id']} does not exist"}), 400

        # Check if from_user exists
        cursor.execute("SELECT * FROM users WHERE user_id=%s", (data['from_user'],))
        if not cursor.fetchone():
            return jsonify({"error": f"from_user {data['from_user']} does not exist"}), 400

        # Check if to_user exists
        cursor.execute("SELECT * FROM users WHERE user_id=%s", (data['to_user'],))
        if not cursor.fetchone():
            return jsonify({"error": f"to_user {data['to_user']} does not exist"}), 400

        # Insert transaction
        cursor.execute(
            "INSERT INTO transactions (product_id, from_user, to_user, quantity) VALUES (%s,%s,%s,%s)",
            (data['product_id'], data['from_user'], data['to_user'], data['quantity'])
        )
        conn.commit()
        return jsonify({"message": "Transaction added successfully!"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()

@app.route('/transactions/<int:transaction_id>', methods=['PUT'])
def update_transaction(transaction_id):
    data = request.json
    # Validate fields
    for field in ['product_id', 'from_user', 'to_user', 'quantity']:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        # Check if transaction exists
        cursor.execute("SELECT * FROM transactions WHERE transaction_id=%s", (transaction_id,))
        if not cursor.fetchone():
            return jsonify({"error": f"Transaction ID {transaction_id} does not exist"}), 404

        # Check foreign keys
        cursor.execute("SELECT * FROM products WHERE product_id=%s", (data['product_id'],))
        if not cursor.fetchone():
            return jsonify({"error": f"product_id {data['product_id']} does not exist"}), 400

        cursor.execute("SELECT * FROM users WHERE user_id=%s", (data['from_user'],))
        if not cursor.fetchone():
            return jsonify({"error": f"from_user {data['from_user']} does not exist"}), 400

        cursor.execute("SELECT * FROM users WHERE user_id=%s", (data['to_user'],))
        if not cursor.fetchone():
            return jsonify({"error": f"to_user {data['to_user']} does not exist"}), 400

        # Update transaction
        cursor.execute(
            "UPDATE transactions SET product_id=%s, from_user=%s, to_user=%s, quantity=%s WHERE transaction_id=%s",
            (data['product_id'], data['from_user'], data['to_user'], data['quantity'], transaction_id)
        )
        conn.commit()
        return jsonify({"message": "Transaction updated successfully!"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()

@app.route('/transactions/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # Check if transaction exists
        cursor.execute("SELECT * FROM transactions WHERE transaction_id=%s", (transaction_id,))
        if not cursor.fetchone():
            return jsonify({"error": f"Transaction ID {transaction_id} does not exist"}), 404

        # Delete transaction
        cursor.execute("DELETE FROM transactions WHERE transaction_id=%s", (transaction_id,))
        conn.commit()
        return jsonify({"message": "Transaction deleted successfully!"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cursor.close()
        conn.close()
# ---------------------------------------
# ----- BLOCKCHAIN TRANSACTIONS ROUTES -----
# ---------------------------------------
@app.route('/blockchain', methods=['GET'])
def get_blockchain():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM blockchain_transactions")
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(data)

@app.route('/blockchain/<int:blockchain_id>', methods=['GET'])
def get_blockchain_tx(blockchain_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM blockchain_transactions WHERE blockchain_id=%s", (blockchain_id,))
    tx = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify(tx)

@app.route('/blockchain', methods=['POST'])
def add_blockchain_tx():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO blockchain_transactions (transaction_id, tx_hash, block_number) VALUES (%s,%s,%s)",
        (data['transaction_id'], data['tx_hash'], data['block_number'])
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Blockchain transaction added successfully!"})

@app.route('/blockchain/<int:blockchain_id>', methods=['PUT'])
def update_blockchain_tx(blockchain_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE blockchain_transactions SET transaction_id=%s, tx_hash=%s, block_number=%s WHERE blockchain_id=%s",
        (data['transaction_id'], data['tx_hash'], data['block_number'], blockchain_id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Blockchain transaction updated successfully!"})

@app.route('/blockchain/<int:blockchain_id>', methods=['DELETE'])
def delete_blockchain_tx(blockchain_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM blockchain_transactions WHERE blockchain_id=%s", (blockchain_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Blockchain transaction deleted successfully!"})

# ---------------------------------------
# ----- TRACEABILITY LOG ROUTES -----
# ---------------------------------------
@app.route('/traceability_log', methods=['GET'])
def get_traceability_logs():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM traceability_log")
    logs = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(logs)

@app.route('/traceability_log/<int:log_id>', methods=['GET'])
def get_traceability_log(log_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM traceability_log WHERE log_id=%s", (log_id,))
    log = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify(log)

@app.route('/traceability_log', methods=['POST'])
def add_traceability_log():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO traceability_log (product_id, stage, location) VALUES (%s,%s,%s)",
        (data['product_id'], data['stage'], data['location'])
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Traceability log added successfully!"})

@app.route('/traceability_log/<int:log_id>', methods=['PUT'])
def update_traceability_log(log_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE traceability_log SET product_id=%s, stage=%s, location=%s WHERE log_id=%s",
        (data['product_id'], data['stage'], data['location'], log_id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Traceability log updated successfully!"})

@app.route('/traceability_log/<int:log_id>', methods=['DELETE'])
def delete_traceability_log(log_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM traceability_log WHERE log_id=%s", (log_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Traceability log deleted successfully!"})

# ---------------------------------------
# ----- PDF EXTRACTION ROUTE -----
# ---------------------------------------
@app.route('/extract_pdf', methods=['POST'])
def extract_pdf():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    filename = file.filename.lower()
    if filename.endswith('.pdf'):
        # Try text extraction first
        text = extract_text_from_pdf(file)
        if text:
            data = parse_soil_data_from_text(text)
            return jsonify(data)
        else:
            # Fallback to multimodal (scanned PDF)
            data = extract_data_multimodal(file, 'application/pdf')
            return jsonify(data)
    elif filename.endswith(('.png', '.jpg', '.jpeg')):
        # Direct multimodal for images
        mime_type = 'image/png' if filename.endswith('.png') else 'image/jpeg'
        data = extract_data_multimodal(file, mime_type)
        return jsonify(data)
    else:
        return jsonify({"error": "Invalid file format. Please upload a PDF or Image (PNG/JPG)."}), 400

# ---------------------------------------
# ----- RUN FLASK -----
# ---------------------------------------
if __name__ == "__main__":
    app.run(debug=True)