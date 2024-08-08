"use client"
import { useState } from "react";
import { Box, Stack, TextField} from "@mui/material";
import { Messages } from "openai/resources/beta/threads/messages";
import Button from '@mui/material/Button';


export default function Home() {
  const [messages, setMessages] = useState([
    { role: "user", content: "Hello, I need support." },
    { role: "assistant", content: "Hi, I am a support assistant. How can I help you today?" }
  ]);
  const [message, setMessage] = useState('');

  const sendMessage = async () => {
    if (!message.trim()) return;
  
    setMessage('');
    setMessages(prevMessages => [
      ...prevMessages,
      { role: "user", content: message },
      { role: "assistant", content: "" }
    ]);
  
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": 'application/json',
        },
        body: JSON.stringify([...messages, { role: "user", content: message }]),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
  
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
  
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(5));
              if (data.type === 'content_block_delta' && data.delta && data.delta.text) {
                setMessages(prevMessages => {
                  const newMessages = [...prevMessages];
                  const lastMessage = newMessages[newMessages.length - 1];
                  return [
                    ...newMessages.slice(0, -1),
                    {
                      ...lastMessage,
                      content: lastMessage.content + data.delta.text
                    }
                  ];
                });
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Handle error (e.g., show an error message to the user)
    }
  };
   
  return (
   <Box width = "100vw" height = "100vh" display = "flex" flexDirection="column" justifyContent="center" alignItems={"center"} >
    <Stack direction = "column" width = "500px" height = "700px" border = "1px solid black"  p = {2} spacing={3} >
    <Stack direction = "column" spacing = {2} flexGrow={1} overflow={"auto"} maxHeight={'100%'}>
    {messages.map((message,index) => (
      <Box  key = {index} display = "flex" justifyContent={message.role === "assistant" ? "flex-start" : 'flex-end'}>
      <Box bgcolor={message.role === 'assistant' ? 'primary.main' : 'secondary.main'} color = "white" borderRadius={16} p = {5}>
        {message.content}
      </Box>
    

      </Box>
    ))}
    
    </Stack>
   <Stack direction = "row" spacing = {2}>
<TextField label = "Message" fullWidth value = {message} onChange={(e) => setMessage(e.target.value)}></TextField>
<Button varient = "contained" onClick={sendMessage} >Sent</Button>
</Stack>
    </Stack>
   </Box>
  );
}
