
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(chunks) {
  
  const response = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: chunks, // Pass the array directly here
  encoding_format: "float",
});


return Response.json({ result: response });
}
