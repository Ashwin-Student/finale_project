import pypdf
import google.generativeai as genai
import json
import re

import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
genai.configure(api_key=GEMINI_API_KEY)
model_llm = genai.GenerativeModel("gemini-flash-latest")

def extract_text_from_pdf(pdf_file):
    try:
        # Seek to beginning in case it was read before
        pdf_file.seek(0)
        reader = pypdf.PdfReader(pdf_file)
        text = ""
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
        
        # If pypdf failed to extract any text (likely a scanned PDF), 
        # we'll use Gemini's multimodal capabilities later in the route
        if not text.strip():
            print("pypdf extracted no text, will try multimodal later")
            return None
            
        print(f"Extracted Text from PDF (first 500 chars): {text[:500]}")
        return text
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return None

def extract_data_multimodal(file_storage, mime_type):
    """Uses Gemini 1.5 Flash to extract data directly from bytes (PDF or Image)"""
    try:
        file_storage.seek(0)
        file_bytes = file_storage.read()
        
        prompt = """
        From the given document/image, extract the following soil nutrient values:
        - Nitrogen (N) in mg/kg
        - Phosphorus (P) in mg/kg
        - Potassium (K) in mg/kg
        - pH Level
        - Moisture Content (%)

        Rules:
        1. Return ONLY valid JSON (no explanation, no extra text).
        2. If a value is missing, return null.
        3. Extract only numeric values (no units).
        4. Ensure keys are exactly: N, P, K, pH, Moisture
        
        Expected format:
        { "N": number | null, "P": number | null, "K": number | null, "pH": number | null, "Moisture": number | null }
        """
        
        response = model_llm.generate_content([
            {'mime_type': mime_type, 'data': file_bytes},
            prompt
        ])
        
        raw_text = response.text.strip()
        print(f"Gemini Multimodal Raw Response: {raw_text}")
        
        match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        return { "N": None, "P": None, "K": None, "pH": None, "Moisture": None }
    except Exception as e:
        print(f"Error in multimodal extraction: {e}")
        return { "N": None, "P": None, "K": None, "pH": None, "Moisture": None }

def parse_soil_data_from_text(text):
    if not text or not text.strip():
        print("Empty text received for parsing")
        return { "N": None, "P": None, "K": None, "pH": None, "Moisture": None }

    prompt = f"""
    From the given text, extract the following values:
    - Nitrogen (N) in mg/kg
    - Phosphorus (P) in mg/kg
    - Potassium (K) in mg/kg
    - pH Level
    - Moisture Content (%)

    Rules:
    1. Return ONLY valid JSON (no explanation, no extra text).
    2. If a value is missing, return null.
    3. Extract only numeric values (no units).
    4. Ensure keys are exactly: N, P, K, pH, Moisture

    Expected format:
    {{ "N": number | null, "P": number | null, "K": number | null, "pH": number | null, "Moisture": number | null }}

    Text to analyze:
    {text}
    """
    try:
        response = model_llm.generate_content(prompt)
        raw_text = response.text.strip()
        print(f"Gemini Text Parsing Raw Response: {raw_text}")
        
        # Clean up the response to ensure it's valid JSON
        match = re.search(r'\{.*\}', raw_text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
        else:
            return { "N": None, "P": None, "K": None, "pH": None, "Moisture": None }
    except Exception as e:
        print(f"Error parsing soil data with Gemini: {e}")
        print("Attempting regex fallback extraction...")
        # Fallback to simple regex if Gemini fails
        fallback_data = { "N": None, "P": None, "K": None, "pH": None, "Moisture": None }
        
        # Try to find numeric values near the keywords, handling newlines with DOTALL
        n_match = re.search(r'Nitrogen.*?(?:(?:N\))?:?\s*)([\d\.]+)', text, re.IGNORECASE | re.DOTALL)
        p_match = re.search(r'Phosphorus.*?(?:(?:P\))?:?\s*)([\d\.]+)', text, re.IGNORECASE | re.DOTALL)
        k_match = re.search(r'Potassium.*?(?:(?:K\))?:?\s*)([\d\.]+)', text, re.IGNORECASE | re.DOTALL)
        ph_match = re.search(r'\bpH\b.*?:?\s*([\d\.]+)', text, re.IGNORECASE | re.DOTALL)
        moisture_match = re.search(r'Moisture.*?:?\s*([\d\.]+)', text, re.IGNORECASE | re.DOTALL)
        
        if n_match: fallback_data["N"] = float(n_match.group(1))
        if p_match: fallback_data["P"] = float(p_match.group(1))
        if k_match: fallback_data["K"] = float(k_match.group(1))
        if ph_match: fallback_data["pH"] = float(ph_match.group(1))
        if moisture_match: fallback_data["Moisture"] = float(moisture_match.group(1))
        
        print(f"Fallback extracted data: {fallback_data}")
        return fallback_data

def generate_crop_justification(soil_data, weather_data, location, crop_name):
    prompt = f"""
    Given the following soil, weather, and location conditions:
    - Location (Latitude, Longitude): {location}
    - Nitrogen: {soil_data.get('nitrogen')} mg/kg
    - Phosphorus: {soil_data.get('phosphorus')} mg/kg
    - Potassium: {soil_data.get('potassium')} mg/kg
    - pH Level: {soil_data.get('ph')}
    - Moisture: {soil_data.get('moisture')}%
    - Temperature: {weather_data.get('temp')}°C
    - Humidity: {weather_data.get('humidity')}%
    - Rainfall: {weather_data.get('rainfall')} mm

    Our AI model has recommended "{crop_name}" as the best crop to grow.
    Please provide exactly 7 to 8 bullet points explaining why this crop is recommended. 
    The FIRST bullet point MUST explicitly mention the user's Location (Latitude, Longitude) and state why this crop is suitable there.
    Each of the remaining bullet points MUST directly reference the specific soil or weather inputs provided (e.g., 'Your Nitrogen level of X mg/kg is optimal for...'). 
    Do not add extra conversational text before or after the bullet points. Just return the bullet points.
    """
    try:
        response = model_llm.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Error generating justification: {e}")
        return None
