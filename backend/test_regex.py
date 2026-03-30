import re

text = """Soil Nutrient Profile
Nitrogen (N)
0-500 mg/kg
Nitrogen is required

Phosphorus (P)
0-500 mg/kg
Phosphorus is required

Potassium (K)
0-500 mg/kg
Potassium is required

pH Level
6-8
pH level is required

Moisture Content
30-70%
Moisture is required

Ru"""

fallback_data = { "N": None, "P": None, "K": None, "pH": None, "Moisture": None }

# Fix regex: If it is "0-500", we should extract the first number or average, but first number is fine.
# We also want to make sure it handles newlines properly after the keyword.
n_match = re.search(r'Nitrogen.*?(?:(?:N\))?:?\s*)([\d\.]+)', text, re.IGNORECASE | re.DOTALL)
p_match = re.search(r'Phosphorus.*?(?:(?:P\))?:?\s*)([\d\.]+)', text, re.IGNORECASE | re.DOTALL)
k_match = re.search(r'Potassium.*?(?:(?:K\))?:?\s*)([\d\.]+)', text, re.IGNORECASE | re.DOTALL)
ph_match = re.search(r'pH.*?:?\s*([\d\.]+)', text, re.IGNORECASE | re.DOTALL)
moisture_match = re.search(r'Moisture.*?:?\s*([\d\.]+)', text, re.IGNORECASE | re.DOTALL)

if n_match: fallback_data["N"] = float(n_match.group(1))
if p_match: fallback_data["P"] = float(p_match.group(1))
if k_match: fallback_data["K"] = float(k_match.group(1))
if ph_match: fallback_data["pH"] = float(ph_match.group(1))
if moisture_match: fallback_data["Moisture"] = float(moisture_match.group(1))

print(fallback_data)
