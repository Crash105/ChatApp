import { NextResponse } from "next/server";
import axios from "axios";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export async function POST(req) {
  try {
    const data = await req.json();

    const response = await axios.post(
      ANTHROPIC_API_URL,
      {
        model: "claude-3-opus-20240229",
        max_tokens: 1024,
        messages: data,
        stream: true
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        responseType: "stream"
      }
    );

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.data;
        for await (const chunk of reader) {
          controller.enqueue(chunk);
        }
        controller.close();
      }
    });

    return new NextResponse(stream);
  } catch (error) {
    console.error("Error:", error);
    return new NextResponse(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}