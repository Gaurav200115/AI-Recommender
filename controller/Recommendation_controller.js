import { MongoClient } from "mongodb"
import { pipeline } from "@xenova/transformers"
import fetch from "node-fetch"
import { loadProducts } from "../data/loader.js"
import { logRecommendation } from "../utils/logger.js"

const uri = process.env.MONGO_URI || "mongodb+srv://gm3908827:Gaurav%401510@cluster0.jy5adia.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
if (!uri) {
  throw new Error("MONGO_URI environment variable is required")
}

const client = new MongoClient(uri)
const db = client.db("productDB")
const collection = db.collection("products")

const embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")

async function initProducts() {
  try {
    const count = await collection.countDocuments()
    console.log(`Found ${count} existing products in database`)

    if (count === 0) {
      console.log("No products found, initializing with sample data...")
      const products = loadProducts()
      const docs = []
      for (const p of products) {
        const embTensor = await embedder(p.desc)
        const emb = Array.from(embTensor.data)
        docs.push({
          _id: p.id,
          desc: p.desc,
          metadata: p,
          embedding: emb,
        })
      }
      await collection.insertMany(docs)
      console.log("Sample products inserted")
    } else {
      console.log("Using existing products from database")
    }
  } catch (error) {
    console.error("Error initializing products:", error)
    throw error
  }
}

try {
  await initProducts()
} catch (error) {
  console.error("Failed to initialize products:", error)
  process.exit(1)
}
export const getRecommendation = async (req, res) => {
  const { query } = req.body;
  try {
    console.log("Query: ", query);

    // Step 1 — Get query embedding
    const queryEmbTensor = await embedder(query);
    const queryEmb = Array.from(queryEmbTensor.data);

    // Step 2 — Vector search in MongoDB
    const results = await collection
      .aggregate([
        {
          $vectorSearch: {
            queryVector: queryEmb,
            path: "embedding",
            numCandidates: 50,
            limit: 5,
            index: "embedding_index",
          },
        },
      ])
      .toArray();

    // Step 3 — Create product context
    const productContext = results
      .map(
        (r) =>
          `Product: ${r.metadata.product_name || r.metadata.name} - ${r.metadata.description || r.desc} (Price: $${r.metadata.price})`
      )
      .join("\n");

    // Step 4 — Call Together AI Chat Completions
    const togetherResp = await fetch("https://api.together.xyz/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.TOGETHER_API_KEY || 'f90dc3ca9c4842ac1b6e91f58d219a05369ec5cf9d955d27701ff424acf060b9'}`
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3-70b-chat-hf",
        messages: [
          {
            role: "system",
            content: "You are a helpful product recommendation assistant."
          },
          {
            role: "user",
            content: `Based on the user query: "${query}"\n\nHere are the most relevant products from our database:\n${productContext}\n\nPlease provide a helpful recommendation explaining which products would be best for the user's needs and why.`
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      }),
    });

    if (!togetherResp.ok) {
      throw new Error(`Together API error: ${togetherResp.status}`);
    }

    const togetherData = await togetherResp.json();
    const explanation = togetherData.choices?.[0]?.message?.content || "No explanation generated.";

    // Step 5 — Log and respond
    logRecommendation(query, explanation, results.map((r) => r.metadata));

    res.json({
      explanation,
      products: results.map((r) => r.metadata),
    });
  } catch (error) {
    console.error("Recommendation error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const putProducts = async (req, res) => {
  try {
    const { brand, product_name, price, category, description } = req.body

    const textToEmbed = `${brand} ${product_name} ${category} ${description}`
    const embeddingTensor = await embedder(textToEmbed)
    const embedding = Array.from(embeddingTensor.data)

    const newDoc = {
      desc: description,
      metadata: {
        brand,
        product_name,
        price,
        category,
        description,
      },
      embedding,
    }

    const result = await collection.insertOne(newDoc)

    res.status(201).json({
      message: "Product inserted successfully",
      id: result.insertedId,
    })
  } catch (error) {
    console.error("Error inserting product:", error)
    res.status(500).json({ error: "Failed to insert product" })
  }
}

export const testing = async (req, res) => {
  res.json({ message: "Hello World" })
}

process.on("SIGINT", async () => {
  console.log("Closing MongoDB connection...")
  await client.close()
  process.exit(0)
})
