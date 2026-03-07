
import requests
import pandas as pd
import numpy as np
import os
import json
import re
from datetime import datetime
from dotenv import load_dotenv
from PIL import Image

import google.generativeai as genai

from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense



BASE_DIR = r"D:\Desktop\Final_year_project"

CONFIG_PATH = os.path.join(BASE_DIR, "secrets", "config.json")

with open(CONFIG_PATH, "r") as f:
    config = json.load(f)

API_KEY_WEATHER = config["WEATHER_API_KEY"]

load_dotenv("./secrets/secrets.env")
genai.configure(api_key=os.getenv("api_key"))

model_llm = genai.GenerativeModel("gemini-2.5-flash")



CSV_PATH = os.path.join(BASE_DIR, "Crop_Recommendation_2.csv")

df = pd.read_csv(CSV_PATH)

le = LabelEncoder()
df['Crop'] = le.fit_transform(df['Crop'])

X = df.drop('Crop', axis=1)
y = df['Crop']

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42
)

model = Sequential([
    Dense(64, activation='relu', input_shape=(X.shape[1],)),
    Dense(32, activation='relu'),
    Dense(len(le.classes_), activation='softmax')
])

model.compile(
    optimizer='adam',
    loss='sparse_categorical_crossentropy',
    metrics=['accuracy']
)

model.fit(X_train, y_train, epochs=50, batch_size=16)

test_loss, test_accuracy = model.evaluate(X_test, y_test)
print(f"\nModel Accuracy: {test_accuracy*100:.2f}%")


ALT_CSV_PATH = os.path.join(BASE_DIR, "Crop_Recommendation_Expanded.csv")

alt_df = pd.read_csv(ALT_CSV_PATH)

alt_df = alt_df[['Original_Crop', 'Alternative_Crop']]

alternative_dict = alt_df.groupby('Original_Crop')['Alternative_Crop'].apply(list).to_dict()



def extract_from_image(image_path):

    image = Image.open(image_path)

    prompt = """
    Extract Nitrogen, Phosphorus, Potassium, pH and Moisture
    from this soil report image.

    Return ONLY valid JSON.
    Do not return units.
    """

    response = model_llm.generate_content([prompt, image])
    raw_text = response.text.strip()

    match = re.search(r'\{.*\}', raw_text, re.DOTALL)

    if match:
        return json.loads(match.group(0))
    else:
        return None



def get_manual_soil_data():

    soil_data = {
        'nitrogen': float(input("Enter Nitrogen: ")),
        'phosphorus': float(input("Enter Phosphorus: ")),
        'potassium': float(input("Enter Potassium: ")),
        'ph': float(input("Enter pH: ")),
        'moisture': float(input("Enter Moisture: "))
    }

    return soil_data


def get_image_soil_data():

    image_path = input("Enter soil report image path: ")

    data = extract_from_image(image_path)

    if data is None:
        print("Could not extract soil data from image")
        exit()

    soil_data = {
        'nitrogen': float(data.get('Nitrogen') or 0),
        'phosphorus': float(data.get('Phosphorus') or 0),
        'potassium': float(data.get('Potassium') or 0),
        'ph': float(data.get('pH') or 7),
        'moisture': float(data.get('Moisture') or 7.5)
    }

    print("\nExtracted Soil Data:", soil_data)

    return soil_data



def get_weather_data(location):

    response = requests.get(
        f"https://api.weatherapi.com/v1/current.json?key={API_KEY_WEATHER}&q={location}"
    )

    data = response.json()

    temperature = data['current']['temp_c']
    humidity = data['current']['humidity']
    rainfall = data['current'].get('precip_mm', 0)

    return temperature, humidity, rainfall


def get_current_season():

    month = datetime.now().month

    if 6 <= month <= 10:
        return "Kharif"

    elif month >= 11 or month <= 2:
        return "Rabi"

    else:
        return "Summer"


seasonal_constraints = {

    "Kharif": [
        "rice","maize","pigeon pea","mung beans","blackgram",
        "pomegranate","bananas","mango","papaya","coconut",
        "cotton","jute","ground nut","millet","sugarcane",
        "paddy","pulses","tobacco"
    ],

    "Rabi": [
        "wheat","chickpea","kidneybean","lentil","apple",
        "orange","carrot","potatoes","barely","oilseeds",
        "vegetables"
    ],

    "Summer": [
        "maize","motha beans","mung beans","grapes",
        "watermelon","muskmelon","melon","vegetables",
        "sugarcane"
    ]
}



def predict_top_3_crops(location, soil):

    temp, humidity, rainfall = get_weather_data(location)
    season = get_current_season()

    input_data = np.array([[

        soil['nitrogen'],
        soil['phosphorus'],
        soil['potassium'],
        temp,
        humidity,
        soil['ph'],
        rainfall

    ]])

    input_scaled = scaler.transform(input_data)

    prediction_probs = model.predict(input_scaled)[0]

    all_crops_pred = list(zip(le.classes_, prediction_probs))

    valid_crops = [

        (crop, prob)
        for crop, prob in all_crops_pred
        if crop.lower() in seasonal_constraints[season]

    ]

    valid_crops.sort(key=lambda x: x[1], reverse=True)

    return [crop[0] for crop in valid_crops[:3]]



def get_alternative_crops(crop):

    alternatives = alternative_dict.get(crop, [])

    return alternatives[:3]


print("\nSelect Input Method")
print("1. Manual Soil Data")
print("2. Upload Soil Report Image")

choice = input("Enter choice: ")

location = input("Enter your location: ")

if choice == "1":

    soil_data = get_manual_soil_data()

elif choice == "2":

    soil_data = get_image_soil_data()

else:
    print("Invalid Choice")
    exit()
7


recommended_crops = predict_top_3_crops(location, soil_data)

print("\nSeason:", get_current_season())

print("\nTop 3 Recommended Crops:\n")

for crop in recommended_crops:

    print("Recommended Crop:", crop)

    alternatives = get_alternative_crops(crop)

    if alternatives:
        print(" Similar Crops:", ", ".join(alternatives))
    else:
        print("   No alternatives available")

    print()