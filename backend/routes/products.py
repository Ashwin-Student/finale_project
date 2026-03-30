# ---- PREDICTED CROPS ROUTES ----
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
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO predicted_crops (prediction_id, crop_id, crop_rank) VALUES (%s,%s,%s)",
        (data['prediction_id'], data['crop_id'], data['crop_rank'])
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Predicted crop added successfully!"})

@app.route('/predicted_crops/<int:id>', methods=['PUT'])
def update_predicted_crop(id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE predicted_crops SET prediction_id=%s, crop_id=%s, crop_rank=%s WHERE id=%s",
        (data['prediction_id'], data['crop_id'], data['crop_rank'], id)
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Predicted crop updated successfully!"})

@app.route('/predicted_crops/<int:id>', methods=['DELETE'])
def delete_predicted_crop(id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM predicted_crops WHERE id=%s", (id,))
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Predicted crop deleted successfully!"})