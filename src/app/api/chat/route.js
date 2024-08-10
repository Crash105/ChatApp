import { NextResponse } from "next/server";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { JSONLoader } from "langchain/document_loaders/fs/json";
import { formatDocumentsAsString } from 'langchain/util/document';

const chatModel = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-4-0613",
  streaming: true,
});

const systemPrompt = `Answer the user's questions based only on the following context. If the answer is not in the context, reply politely that you do not have that information available. You can communicate in multiple languages. If user wants to end the chat, ask them to rate their experience from 1 being terrible and 5 being great. You can respond in multiple languages but you MUST still use context. LIMIT your responses to one sentences.
==============================
Context: {context}
==============================
Current conversation: {chat_history}
`;

const loader = new JSONLoader(
  "public/states.json",
  [
    "/camp_title", 
    "/state", 
    "/slug", 
    "/code", 
    "/city", 
    "/town", 
    "/camp_attendance_cost", 
    "/description",
    "/dates", 
    "/age_groups", 
    "/facilities", 
    "/testimonials", 
    "/coaches", 
    "/website", 
    "/facebook_url", 
    "/twitter_url", 
    "/instagram_url"
  ]
);

const chatPrompt = ChatPromptTemplate.fromMessages([
  ["system", systemPrompt],
  ["human", "{input}"],
]);

const outputParser = new StringOutputParser();

export async function POST(req) {
  const data = await req.json();
  console.log(data);

  let docs = [];
  try {
    docs = await loader.load();
    console.log('Documents loaded successfully:', docs);
  } catch (err) {
    console.error('Error loading documents:', err);
    return new NextResponse('Error loading documents', { status: 500 });
  }

  const context = formatDocumentsAsString(docs);

  // Extract chat history from the data
  const chatHistory = data.slice(0, -1).map(msg => `${msg.role}: ${msg.content}`).join('\n');

  const chain = chatPrompt.pipe(chatModel).pipe(outputParser);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const streamingChain = await chain.stream({
          input: data[data.length - 1].content,
          context: context,
          chat_history: chatHistory,
        });

        for await (const chunk of streamingChain) {
          const text = encoder.encode(chunk);
          controller.enqueue(text);
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new NextResponse(stream);
}