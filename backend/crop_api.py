from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import requests
from datetime import datetime
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Dense
import mysql.connector
from config import WEATHER_API_KEY
from web3 import Web3
import json
import sys, os
import joblib

# Import PDF extraction logic
try:
    from pdf_utils import extract_text_from_pdf, parse_soil_data_from_text, extract_data_multimodal, generate_crop_justification
except ImportError:
    pass

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(BASE_DIR)
from Blockchain.Blockchain_service import (
    add_manufacturer, add_distributor, add_retailer,
    create_batch, distributor_receive, distributor_dispatch, retailer_receive,
    get_batch
)

app = Flask(__name__)
CORS(app)

# ---------------- BLOCKCHAIN CONFIG ----------------
GANACHE_URL = "http://127.0.0.1:8545"
w3 = Web3(Web3.HTTPProvider(GANACHE_URL))
CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"

try:
    with open(os.path.join(BASE_DIR, "Blockchain", "contract_abi.json")) as f:
        abi = json.load(f)

    contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=abi)
    w3.eth.default_account = w3.eth.accounts[0]
except Exception as e:
    print("Blockchain connection failed:", e)
    contract = None

def _safe_log_blockchain_tx(tx_hash, transaction_id):
    if not tx_hash:
        return
    conn = get_db_connection()
    if not conn:
        return
    try:
        cursor = conn.cursor()
        block_number = None
        try:
            receipt = w3.eth.get_transaction_receipt(tx_hash)
            block_number = receipt.blockNumber
        except Exception:
            block_number = None
        try:
            cursor.execute(
                "INSERT INTO blockchain_transactions (transaction_id, tx_hash, block_number) VALUES (%s,%s,%s)",
                (transaction_id, tx_hash, block_number)
            )
        except mysql.connector.Error:
            # Fallback if schema is different/minimal
            cursor.execute(
                "INSERT INTO blockchain_transactions (tx_hash) VALUES (%s)",
                (tx_hash,)
            )
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()

def _safe_log_traceability(batch_id, stage, location):
    conn = get_db_connection()
    if not conn:
        return
    try:
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO traceability_log (product_id, stage, location) VALUES (%s,%s,%s)",
                (batch_id, stage, location)
            )
        except mysql.connector.Error:
            # Accept alternative table naming if present.
            cursor.execute(
                "INSERT INTO traceability_logs (batch_id, stage, location) VALUES (%s,%s,%s)",
                (batch_id, stage, location)
            )
        conn.commit()
    except Exception:
        pass
    finally:
        conn.close()

# ---------------- DATABASE ----------------
def get_db_connection():
    try:
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="Ashvin@123",
            database="crop_project"
        )
        return conn
    except mysql.connector.Error as err:
        print("DB Connection Error:", err)
        return None

# ---------------- AI MODEL ----------------
BACKEND_DIR = os.path.dirname(__file__)
CSV_PATH = os.path.join(BACKEND_DIR, "Crop_Recommendation_2.csv")
MODEL_PATH = os.path.join(BACKEND_DIR, "crop_model.h5")
SCALER_PATH = os.path.join(BACKEND_DIR, "scaler.joblib")
LABEL_ENCODER_PATH = os.path.join(BACKEND_DIR, "label_encoder.joblib")

# Load city coordinates
CITY_DATA_PATH = os.path.join(BACKEND_DIR, "india_cities.json")
with open(CITY_DATA_PATH, 'r') as f:
    cities_list = json.load(f)
cities_map = {c['name'].lower(): c for c in cities_list}

df = pd.read_csv(CSV_PATH)

# --- Data Augmentation: Assign Coordinates based on Crop Type ---
# This ensures the model learns a "location factor"
crop_location_mapping = {
    'rice': 'Kolkata', 'maize': 'Ludhiana', 'chickpea': 'Indore',
    'kidneybeans': 'Srinagar', 'pigeonpeas': 'Nagpur', 'mothbeans': 'Jaipur',
    'mungbean': 'Jaipur', 'blackgram': 'Nagpur', 'lentil': 'Patna',
    'pomegranate': 'Nashik', 'banana': 'Coimbatore', 'mango': 'Lucknow',
    'grapes': 'Nashik', 'watermelon': 'Surat', 'muskmelon': 'Ahmedabad',
    'apple': 'Srinagar', 'orange': 'Nagpur', 'papaya': 'Visakhapatnam',
    'coconut': 'Kolkata', 'cotton': 'Ahmedabad', 'jute': 'Kolkata',
    'coffee': 'Bangalore'
}

def assign_lat(crop):
    city_name = crop_location_mapping.get(crop.lower(), 'Delhi')
    return cities_map.get(city_name.lower(), {'lat': 28.6139})['lat']

def assign_lng(crop):
    city_name = crop_location_mapping.get(crop.lower(), 'Delhi')
    return cities_map.get(city_name.lower(), {'lng': 77.2090})['lng']

df['Lat'] = df['Crop'].apply(assign_lat)
df['Lng'] = df['Crop'].apply(assign_lng)

le = LabelEncoder()
df['Crop'] = le.fit_transform(df['Crop'])

X = df.drop('Crop', axis=1) # Features: N, P, K, Temp, Humidity, pH, Rainfall, Lat, Lng
y = df['Crop']
scaler = StandardScaler()

# Force retrain if we are adding new features
if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH) and os.path.exists(LABEL_ENCODER_PATH):
    print("Loading AI model...")
    # Check if the model has the correct number of input features
    try:
        model = load_model(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        le = joblib.load(LABEL_ENCODER_PATH)
        if model.input_shape[1] != X.shape[1]:
            print("Feature count mismatch. Retraining...")
            raise ValueError("Feature mismatch")
    except Exception:
        print("Training new AI model with location features...")
        X_scaled = scaler.fit_transform(X)
        X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
        model = Sequential([
            Dense(64, activation='relu', input_shape=(X.shape[1],)),
            Dense(32, activation='relu'),
            Dense(len(le.classes_), activation='softmax')
        ])
        model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
        model.fit(X_train, y_train, epochs=50, batch_size=16)
        model.save(MODEL_PATH)
        joblib.dump(scaler, SCALER_PATH)
        joblib.dump(le, LABEL_ENCODER_PATH)
else:
    print("Training new AI model...")
    X_scaled = scaler.fit_transform(X)
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
    model = Sequential([
        Dense(64, activation='relu', input_shape=(X.shape[1],)),
        Dense(32, activation='relu'),
        Dense(len(le.classes_), activation='softmax')
    ])
    model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
    model.fit(X_train, y_train, epochs=50, batch_size=16)
    
    # Save model and tools
    model.save(MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    joblib.dump(le, LABEL_ENCODER_PATH)
    print("Model and tools saved.")

# ---------------- HELPER FUNCTIONS ----------------
def get_weather_data(location, lat=None, lng=None):
    try:
        query = location
        if location.lower() == "detected location" and lat is not None and lng is not None:
            query = f"{lat},{lng}"
        
        url = f"https://api.weatherapi.com/v1/current.json?key={WEATHER_API_KEY}&q={query}"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        return data['current']['temp_c'], data['current']['humidity'], data['current'].get('precip_mm', 0)
    except:
        return 25, 60, 0

def get_current_season():
    month = datetime.now().month
    if 6 <= month <= 10:
        return "Kharif"
    elif month >= 11 or month <= 2:
        return "Rabi"
    else:
        return "Summer"

def get_logged_in_user_id():
    return 2

# ---------------- BLOCKCHAIN FUNCTIONS ----------------
# ---------------- PREDICT ROUTE ----------------
@app.route("/predict", methods=["GET", "POST"])
def predict_crop():
    if request.method == "GET":
        return "Use POST request for prediction"
    try:
        data = request.json
        user_id = get_logged_in_user_id()
        location = data["location"]

        soil = {k: data[k] for k in ["nitrogen","phosphorus","potassium","ph","moisture"]}
        
        # Validation: check if location is valid
        loc_lower = location.lower()
        if loc_lower != "detected location" and loc_lower not in cities_map:
            return jsonify({"error": f"Invalid city name: {location}. Please select a valid city from the list."}), 400

        lat = data.get("lat")
        lng = data.get("lng")
        
        # If lat/lng missing or "detected location", we use defaults or extracted values
        if lat is None or lng is None:
            if loc_lower in cities_map:
                lat = cities_map[loc_lower]['lat']
                lng = cities_map[loc_lower]['lng']
            else:
                lat, lng = 28.6139, 77.2090 # Default Delhi

        temp, humidity, rainfall = get_weather_data(location, lat, lng)

        input_data = np.array([[
            soil['nitrogen'], soil['phosphorus'], soil['potassium'], 
            temp, humidity, soil['ph'], rainfall,
            lat, lng
        ]])
        input_scaled = scaler.transform(input_data)
        prediction_probs = model.predict(input_scaled)[0]

        top_indices = np.argsort(prediction_probs)[-3:][::-1]
        crops = [le.inverse_transform([i])[0] for i in top_indices]

        justification = ""
        try:
            weather = {"temp": temp, "humidity": humidity, "rainfall": rainfall}
            justification = generate_crop_justification(soil, weather, location, crops[0])
            if not justification:
                justification = f"Recommended based on {get_current_season()} season."
        except Exception as e:
            print("Error generating justification:", e)
            justification = f"Recommended based on {get_current_season()} season."

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("INSERT INTO soil_data (user_id, nitrogen, phosphorus, potassium, ph, moisture) VALUES (%s,%s,%s,%s,%s,%s)",
                       (user_id, soil["nitrogen"], soil["phosphorus"], soil["potassium"], soil["ph"], soil["moisture"]))
        soil_id = cursor.lastrowid
        cursor.execute("INSERT INTO predictions (user_id, soil_id, location, season) VALUES (%s,%s,%s,%s)",
                       (user_id, soil_id, location, get_current_season()))
        prediction_id = cursor.lastrowid

        for rank, crop_name in enumerate(crops, 1):
            cursor.execute("SELECT crop_id FROM crops WHERE crop_name=%s", (crop_name,))
            result = cursor.fetchone()
            if result:
                cursor.execute("INSERT INTO predicted_crops (prediction_id, crop_id, crop_rank) VALUES (%s,%s,%s)",
                               (prediction_id, result["crop_id"], rank))
        conn.commit()
        conn.close()

        return jsonify({"season": get_current_season(), "recommended_crops": crops, "justification": justification})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- PDF EXTRACTION ROUTE ----------------
@app.route('/extract_pdf', methods=['POST'])
def extract_pdf():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
        
    filename = file.filename.lower()
    if filename.endswith('.pdf') or filename.endswith('.png') or filename.endswith('.jpg') or filename.endswith('.jpeg'):
        # Try text extraction first for PDFs
        if filename.endswith('.pdf'):
            text = extract_text_from_pdf(file)
            if text:
                data = parse_soil_data_from_text(text)
                return jsonify(data)
        
        # Fallback to multimodal for images or scanned PDFs
        data = extract_data_multimodal(file, file.mimetype or 'application/pdf')
        return jsonify(data)
    else:
        return jsonify({"error": "Unsupported file format"}), 400

# ---------------- BLOCKCHAIN ROUTES ----------------
@app.route('/stats', methods=['GET'])
def get_stats():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT COUNT(*) as count FROM seed_batches")
        result = cursor.fetchone()
        conn.close()
        return jsonify({"active_batches": result['count'] if result else 0})
    except Exception as e:
        return jsonify({"active_batches": 0, "error": str(e)})

@app.route('/bc/add_manufacturer', methods=['POST'])
def add_manufacturer_bc():
    try:
        data = request.json
        tx_hash = add_manufacturer(data['address'])
        return jsonify({"message": "Manufacturer added", "tx_hash": tx_hash})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/bc/add_distributor', methods=['POST'])
def add_distributor_bc():
    try:
        data = request.json
        tx_hash = add_distributor(data['address'])
        return jsonify({"message": "Distributor added", "tx_hash": tx_hash})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/bc/add_retailer', methods=['POST'])
def add_retailer_bc():
    try:
        data = request.json
        tx_hash = add_retailer(data['address'])
        return jsonify({"message": "Retailer added", "tx_hash": tx_hash})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/bc/create_batch', methods=['POST'])
def create_batch_bc():
    try:
        data = request.json
        # ROLE CHECK
        if data.get('role') != 'manufacturer':
            return jsonify({"error": "Unauthorized: Only Manufacturer can create a batch"}), 403

        manufacturer_id = data.get('manufacturer_id')
        
        # We only call blockchain if it's NOT already on blockchain
        tx_hash = None
        if not data.get('already_on_blockchain'):
            tx_hash = create_batch(data['batch_id'], data['seed_name'], data['variety'], data['crop_type'])
        else:
            tx_hash = data.get('tx_hash')

        # Save to DB for tracking count and details
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            try:
                cursor.execute("""
                    INSERT INTO seed_batches (batch_id, seed_name, seed_variety, crop_type, manufacturer_id, status)
                    VALUES (%s, %s, %s, %s, %s, 'Manufactured')
                    ON DUPLICATE KEY UPDATE seed_name=%s, seed_variety=%s, crop_type=%s, manufacturer_id=%s, status='Manufactured'
                """, (
                    data['batch_id'], data['seed_name'], data['variety'], data['crop_type'], manufacturer_id,
                    data['seed_name'], data['variety'], data['crop_type'], manufacturer_id
                ))
            except mysql.connector.Error:
                try:
                    # Backward-compatible fallback for older seed_batches schema.
                    cursor.execute("""
                        INSERT INTO seed_batches (batch_id, seed_name, status)
                        VALUES (%s, %s, 'Manufactured')
                        ON DUPLICATE KEY UPDATE seed_name=%s, status='Manufactured'
                    """, (
                        data['batch_id'], data['seed_name'],
                        data['seed_name']
                    ))
                except mysql.connector.Error:
                    # Minimal fallback for very old schema versions.
                    cursor.execute("""
                        INSERT INTO seed_batches (batch_id)
                        VALUES (%s)
                        ON DUPLICATE KEY UPDATE batch_id=%s
                    """, (
                        data['batch_id'],
                        data['batch_id']
                    ))
            conn.commit()
            conn.close()
        _safe_log_blockchain_tx(tx_hash, data['batch_id'])
        _safe_log_traceability(data['batch_id'], 'Manufactured', 'Manufacturer')
            
        return jsonify({"message": "Batch created", "tx_hash": tx_hash})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/bc/distributor_receive', methods=['POST'])
def distributor_receive_bc():
    try:
        data = request.json
        tx_hash = data.get('tx_hash')
        if not data.get('already_on_blockchain'):
            tx_hash = distributor_receive(data['batch_id'], data['warehouse'])
        
        # Save to DB
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE seed_batches 
                SET status='At Distributor', warehouse_location=%s 
                WHERE batch_id=%s
            """, (data['warehouse'], data['batch_id']))
            conn.commit()
            conn.close()
        _safe_log_blockchain_tx(tx_hash, data['batch_id'])
        _safe_log_traceability(data['batch_id'], 'At Distributor', data.get('warehouse', 'Distributor'))
            
        return jsonify({"message": "Distributor received", "tx_hash": tx_hash})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/bc/distributor_dispatch', methods=['POST'])
def distributor_dispatch_bc():
    try:
        data = request.json
        tx_hash = data.get('tx_hash')
        if not data.get('already_on_blockchain'):
            tx_hash = distributor_dispatch(data['batch_id'], data['mode'], data['vehicle'])
        
        # Save to DB
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE seed_batches 
                SET status='Dispatched', transport_mode=%s, vehicle_number=%s 
                WHERE batch_id=%s
            """, (data['mode'], data['vehicle'], data['batch_id']))
            conn.commit()
            conn.close()
        _safe_log_blockchain_tx(tx_hash, data['batch_id'])
        _safe_log_traceability(data['batch_id'], 'Dispatched', str(data.get('mode', 'Road')))
            
        return jsonify({"message": "Dispatched", "tx_hash": tx_hash})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/bc/retailer_receive', methods=['POST'])
def retailer_receive_bc():
    try:
        data = request.json
        tx_hash = data.get('tx_hash')
        if not data.get('already_on_blockchain'):
            tx_hash = retailer_receive(data['batch_id'], data['price'])
        
        # Save to DB
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE seed_batches 
                SET status='At Retailer', selling_price=%s 
                WHERE batch_id=%s
            """, (data['price'], data['batch_id']))
            conn.commit()
            conn.close()
        _safe_log_blockchain_tx(tx_hash, data['batch_id'])
        _safe_log_traceability(data['batch_id'], 'At Retailer', 'Retailer')
            
        return jsonify({"message": "Retailer received", "tx_hash": tx_hash})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/bc/get_batch/<batch_id>', methods=['GET'])
def get_batch_bc(batch_id):
    try:
        batch = get_batch(batch_id)
        return jsonify({"batch_data": batch})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/bc/get_batch_sql/<batch_id>', methods=['GET'])
def get_batch_sql(batch_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM seed_batches WHERE batch_id=%s", (batch_id,))
        batch = cursor.fetchone()
        conn.close()
        
        if batch:
            return jsonify({"batch_data": batch})
        else:
            return jsonify({"error": "Batch not found in SQL"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/bc/list_batches', methods=['GET'])
def list_batches():
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("SELECT * FROM seed_batches ORDER BY created_at DESC")
        except mysql.connector.Error:
            cursor.execute("SELECT * FROM seed_batches ORDER BY id DESC")
        batches = cursor.fetchall()
        conn.close()
        return jsonify({"batches": batches})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------------- LOGIN / REGISTER ----------------
@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.json
        email = data.get('email')
        password = data.get('password')
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM users WHERE email=%s AND password=%s", (email, password))
        user = cursor.fetchone()
        
        if user:
            # Don't send password back
            del user['password']
            return jsonify({"user": user})
        else:
            return jsonify({"error": "Invalid email or password"}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.json
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        role = data.get('role', 'farmer')
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Check if user already exists
        cursor.execute("SELECT * FROM users WHERE email=%s", (email,))
        if cursor.fetchone():
            return jsonify({"error": "User already exists"}), 400
            
        cursor.execute(
            "INSERT INTO users (name, email, password, role) VALUES (%s, %s, %s, %s)",
            (name, email, password, role)
        )
        conn.commit()
        user_id = cursor.lastrowid
        
        return jsonify({
            "user": {
                "user_id": user_id,
                "name": name,
                "email": email,
                "role": role
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

# ---------------- RUN APP ----------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)