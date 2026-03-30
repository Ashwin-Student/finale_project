import sys
import os
sys.path.append(os.path.dirname(__file__))

import google.generativeai as genai
GEMINI_API_KEY = "AIzaSyCaDYXTpkCHwSfYWXnevXbmVTFlYViuFds"
genai.configure(api_key=GEMINI_API_KEY)

model_llm = genai.GenerativeModel("gemini-flash-latest")

soil = {"nitrogen": 120, "phosphorus": 40, "potassium": 30, "ph": 6.5, "moisture": 60}
weather = {"temp": 28, "humidity": 60, "rainfall": 100}
crop_name = "Coffee"

prompt = f"""
Given the following soil and weather conditions:
- Nitrogen: {soil.get('nitrogen')} mg/kg
- Phosphorus: {soil.get('phosphorus')} mg/kg
- Potassium: {soil.get('potassium')} mg/kg
- pH Level: {soil.get('ph')}
- Moisture: {soil.get('moisture')}%
- Temperature: {weather.get('temp')}°C
- Humidity: {weather.get('humidity')}%
- Rainfall: {weather.get('rainfall')} mm

Our AI model has recommended "{crop_name}" as the best crop to grow.
Please provide a brief, easy-to-understand justification (2-3 sentences) for the farmer on why this crop is recommended based on these specific soil and weather inputs.
"""

try:
    print("Generating justification...")
    res = model_llm.generate_content(prompt)
    print("Result:", res.text.strip())
except Exception as e:
    print("Exception:", e)
