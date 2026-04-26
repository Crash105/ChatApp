
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(chunks) {

 const {input} = await chunks.json()
 
 if (!input) {
    return Response.json({ error: 'No chunks provided' }, { status: 400 });
  }
  
  const response = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: input, // Pass the array directly here
  encoding_format: "float",
});


return Response.json({ embeddings: response });
}
