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
    const {userid} = body

    if (!input) {
      return Response.json({ error: 'No valid input (embeddings) provided' }, { status: 400 });
    }

    // 2. Select the index and namespace
    const index = pc.index("ragpdfs").namespace(userid);

    // 3. Use the correct .upsert() method
    await index.upsert({ records: input });

    return Response.json({ status: "success" }, { status: 200 });
    
  } catch (error) {
    console.error("Pinecone Upsert Error:", error);
    return Response.json({ error: 'Failed to upsert to Pinecone' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { vectorIds, userid } = await req.json();
    if (!vectorIds?.length || !userid) {
      return Response.json({ error: 'Missing vectorIds or userid' }, { status: 400 });
    }
    const index = pc.index("ragpdfs").namespace(userid);
    await index.deleteMany(vectorIds);
    return Response.json({ status: 'success' });
  } catch (error) {
    console.error("Pinecone Delete Error:", error);
    return Response.json({ error: 'Failed to delete from Pinecone' }, { status: 500 });
  }
}