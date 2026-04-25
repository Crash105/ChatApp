
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


export async function streamResponses(messages) {

    const stream = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        streaming: true,
        messages: messages


    })

}