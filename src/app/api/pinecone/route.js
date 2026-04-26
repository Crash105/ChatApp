// app/api/upsert/route.js
import { Pinecone } from "@pinecone-database/pinecone";

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

export async function POST(req) {
  try {
    // 1. Correctly parse the request object
    const body = await req.json();
    const { input } = body;
    console.log("Pinecone input length:", input?.length, "first item:", input?.[0]?.id);

    if (!input) {
      return Response.json({ error: 'No valid input (embeddings) provided' }, { status: 400 });
    }

    // 2. Select the index and namespace
    const index = pc.index("ragpdfs");

    // 3. Use the correct .upsert() method
    await index.upsert({ records: input });

    return Response.json({ status: "success" }, { status: 200 });
    
  } catch (error) {
    console.error("Pinecone Upsert Error:", error);
    return Response.json({ error: 'Failed to upsert to Pinecone' }, { status: 500 });
  }
}