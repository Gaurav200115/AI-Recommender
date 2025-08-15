// logRecommendation.js
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';

// ====== MongoDB Setup ======
const mongoUri = process.env.MONGODB_URI || "mongodb+srv://gm3908827:Gaurav%401510@cluster0.jy5adia.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"; // Add this in Vercel env variables
if (mongoUri && mongoose.connection.readyState === 0) {
  mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
}

const logSchema = new mongoose.Schema({
  prompt: String,
  explanation: String,
  products: Array,
  timestamp: { type: Date, default: Date.now }
});

const LogModel = mongoose.models.RecommendationLog || mongoose.model('RecommendationLog', logSchema);

// ====== File Path for Local Logging ======
const logFilePath = path.join(process.cwd(), 'recommendation_logs.txt');

// ====== Function ======
export const logRecommendation = async (prompt, explanation, products) => {
  const timestamp = new Date().toISOString();

  // Common log entry format
  const logEntry = `
[${timestamp}]
Prompt: ${prompt}
AI Explanation: ${explanation}
Products: ${JSON.stringify(products, null, 2)}
----------------------------------------------
`;

  if (process.env.NODE_ENV !== 'production') {
    // Local logging to file
    fs.appendFileSync(logFilePath, logEntry);
    console.log("✅ Log saved locally");
  } else {
    // Production logging to MongoDB
    try {
      await LogModel.create({
        prompt,
        explanation,
        products
      });
      console.log("✅ Log saved to MongoDB");
    } catch (err) {
      console.error("❌ Failed to save log to MongoDB:", err);
    }
  }
};
