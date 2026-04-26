import {NextResponse} from "next/server"
import {Pinecone} from "@pinecone-database/pinecone"
import OpenAI from "openai"


const systemPrompt =
`
You are an AI assistant that answers questions about user-submitted PDFs using retrieved document excerpts.

## Response Style
- Be concise. Give short, direct answers unless the user asks for more detail.
- Weave retrieved information naturally into your answer — do not label or number chunks.
- If multiple facts come from the same source, cite the link once at the end rather than repeating it.
- If facts come from different sources, cite each source inline as a markdown link: [View Source](url)
- Only expand into a longer answer if the user explicitly asks (e.g. "explain in detail", "tell me more").

## Format
- 1-3 sentences answering the question directly
- Inline source link(s) after the relevant fact, e.g: "The Zibble-Flop procedure increases throughput by 50%. [View Source](url)"
- Skip a conclusion unless the user asks for a summary.

## Guidelines
- If the query is too vague, ask one clarifying question.
- If no relevant information is found, say so briefly.
- Maintain a neutral, helpful tone.
`



const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

 const pc = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
})

export async function POST(req){
   
    const data = await req.json()

    console.log(data)

    if (!Array.isArray(data) || data.length === 0) {
        return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const index = pc.index("ragpdfs");

    const text = data[data.length - 1].content
    const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        encoding_format: "float"
    })

    const result = await index.query({
        topK: 3,
        includeMetadata: true,
        vector: embedding.data[0].embedding
    })

    console.log(result)

    let resultString = "\n\nReturned results from vector db (done automatically):"
    result.matches.forEach((match) => {
        resultString += `\nContent: ${match.metadata.text}\nSource: ${match.metadata.url}\n`
    })

   

    const lastMessage = data[data.length - 1]
    const lastMessageContent = lastMessage.content + resultString
    const lastDataWithoutLastMessage = data.slice(0, data.length-1)
    
    
    const completion = await openai.chat.completions.create({
        messages: [
            {role: "system", content: systemPrompt},
            ...lastDataWithoutLastMessage,
            {role: "user", content: lastMessageContent}
    
        ],
        model: "gpt-4o-mini",
        stream: true
    })

    const stream = new ReadableStream({
        async start(controller){
            const encoder = new TextEncoder()
            try {
                for await (const chunk of completion){
                    const content = chunk.choices[0]?.delta?.content
                    if (content){
                        const text = encoder.encode(content)
                        controller.enqueue(text)
                    }
                }
            }

            catch (err) {
                controller.error(err)
            }

            finally {
                controller.close()
            }
        }
    })

    return new NextResponse(stream)

}