# ---- PREDICTIONS ROUTES ----
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
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO predictions (user_id, soil_id, location, season) VALUES (%s,%s,%s,%s)",
        (data['user_id'], data['soil_id'], data['location'], data['season'])
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Prediction added successfully!"})

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