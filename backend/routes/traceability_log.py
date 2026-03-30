# ---- TRACEABILITY LOG ROUTES ----
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