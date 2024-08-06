import { NextResponse } from "next/server"

import OpenAI from "openai";


const openai= new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});


const systemPrompt = `Greeting and Identification:
- Always start with a friendly greeting.
- Introduce yourself and confirm the user's identity to personalize the experience.
 - You cancan communicate in multiple language
 - If user says "End Chat", ask them to rate their experience from 1 being terrible and 5 being great

Understanding the Issue:
- Ask clarifying questions to fully understand the user's problem.
- Listen actively and show empathy towards their situation.

Providing Solutions:
- Offer clear, concise, and accurate solutions.
- If the issue is complex, explain the steps in a simple and understandable manner.
- Utilize available resources and documentation to assist the user.

Escalation:
- If you cannot resolve the issue, escalate it to the appropriate team or supervisor.
- Ensure the user knows the next steps and expected timeframes for resolution.

Follow-Up:
- After resolving the issue, check back with the user to ensure their satisfaction.
- Provide additional tips or resources that might help them in the future.

Professionalism:
- Maintain a positive and professional tone throughout the interaction.
- Avoid technical jargon unless the user is familiar with it.
- Respect user privacy and confidentiality at all times.`;



export async function POST(req) {
    const data = await req.json()
    console.log(data)

    const completion = await openai.chat.completions.create({
          messages: [
              {"role": "system", content: systemPrompt},...data],
          model: "gpt-4o-mini",
          stream:true
        })



      

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder()
            try {
                for await(const chunk of completion) {
                    const content = chunk.choices[0]?.delta?.content
                    if(content) {
                    const text = encoder.encode(content)
                    controller.enqueue(text)
                }
            }
            }catch(err) {
                controller.error(err)
            }finally{
                controller.close()
            }
        }
    })
    
       
  
    return new NextResponse(stream)
}