# ---- SOIL DATA ROUTES ----
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
    cursor.execute(
        "INSERT INTO soil_data (user_id, nitrogen, phosphorus, potassium, ph, moisture) VALUES (%s,%s,%s,%s,%s,%s)",
        (data['user_id'], data['nitrogen'], data['phosphorus'], data['potassium'], data['ph'], data['moisture'])
    )
    conn.commit()
    cursor.close()
    conn.close()
    return jsonify({"message": "Soil data added successfully!"})

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