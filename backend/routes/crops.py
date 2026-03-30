# ---- CROPS ROUTES ----
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