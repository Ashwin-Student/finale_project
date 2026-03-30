import { predictCrop } from "../api";

// make sure these states exist in your component
// const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
// const [predicting, setPredicting] = useState(false);
// const [error, setError] = useState<string | null>(null);

const onSubmit = async (formData: any) => {
  try {
    if (!location) {
      setError("Please get location first");
      return;
    }

    setPredicting(true);
    setError(null);

    const dataToSend = {
      location: `${location.lat},${location.lng}`,   // ✅ FIXED (was locationState)
      nitrogen: formData.n,
      phosphorus: formData.p,
      potassium: formData.k,
      ph: formData.ph,
      moisture: formData.moisture,
    };

    const result = await predictCrop(dataToSend);

    setPredictionResult(result);   // make sure this state exists
    navigate("crop-result");      // make sure navigate exists

  } catch (err) {
    console.error(err);
    setError("Failed to predict crop.");
  } finally {
    setPredicting(false);
  }
};