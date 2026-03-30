# ---- BLOCKCHAIN TRANSACTIONS ROUTES ----
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