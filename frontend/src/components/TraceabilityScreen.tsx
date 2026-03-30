import { createBatchBC, getBatchBC } from "../api"; // import at the top

// Example: create a batch
const handleCreateBatch = async () => {
  try {
    const res = await createBatchBC({
      batch_id: "BATCH-001",
      seed_name: "Wheat",
      variety: "Premium",
      crop_type: "Kharif",
    });
    console.log(res);
  } catch (err) {
    console.error(err);
  }
};

// Example: fetch a batch by ID
const handleTrackBatch = async (batchId: string) => {
  try {
    const res = await getBatchBC(batchId);
    console.log(res.batch_data);
  } catch (err) {
    console.error(err);
  }
};