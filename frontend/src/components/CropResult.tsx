import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { predictCrop } from "../api"; // your API call
import { Button, Card } from "./UI"; // if you have reusable UI components

interface CropResultProps {
  predictionData: any; // data returned from the backend
}

const CropResult = ({ predictionData }: CropResultProps) => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const saveResult = async () => {
    setSaving(true);
    try {
      // Call your API to save the prediction to DB
      await predictCrop(predictionData);
      alert("Result saved successfully!");
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert("Error saving result");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 pb-24">
      <h2 className="text-2xl font-bold text-slate-900">Recommended Crops</h2>

      <Card className="p-6 space-y-4">
        <p className="text-slate-700 text-sm">
          Location: {predictionData.location}
        </p>
        <p className="text-slate-700 text-sm">
          Season: {predictionData.season}
        </p>

        <h3 className="font-bold text-lg">Top Crops:</h3>
        <ul className="list-disc ml-5">
          {predictionData.recommended_crops.map((crop: string, idx: number) => (
            <li key={idx}>{crop}</li>
          ))}
        </ul>
      </Card>

      <Button onClick={saveResult} disabled={saving}>
        {saving ? "Saving..." : "Save Result"}
      </Button>

      <Button variant="outline" onClick={() => navigate("/crop-form")}>
        Back
      </Button>
    </div>
  );
};

export default CropResult;