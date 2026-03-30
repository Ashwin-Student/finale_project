# ---- USER TRANSACTIONS ROUTES ----
@app.route('/transactions', methods=['GET'])
def get_transactions():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM user_transactions")
    transactions = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(transactions)

@app.route('/transactions/<int:transaction_id>', methods=['GET'])
def get_transaction(transaction_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM user_transactions WHERE transaction_id=%s", (transaction_id,))
    transaction = cursor.fetchone()
    cursor.close()
    conn.close()
    return jsonify(transaction)

@app.route('/transactions', methods=['POST'])
def add_transaction():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO user_transactions (product_id, from_user, to_user, quantity) VALUES (%s,%s,%s,%s)",
        (data['product_id'], data['from_user'], data['to_user'], data['quantity'])
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Transaction added successfully!"})

@app.route('/transactions/<int:transaction_id>', methods=['PUT'])
def update_transaction(transaction_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE user_transactions SET product_id=%s, from_user=%s, to_user=%s, quantity=%s WHERE transaction_id=%s",
        (data['product_id'], data['from_user'], data['to_user'], data['quantity'], transaction_id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Transaction updated successfully!"})

@app.route('/transactions/<int:transaction_id>', methods=['DELETE'])
def delete_transaction(transaction_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM user_transactions WHERE transaction_id=%s", (transaction_id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Transaction deleted successfully!"})