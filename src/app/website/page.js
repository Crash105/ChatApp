"use client"
import { useState } from "react";
import { Box, Stack, TextField, Typography} from "@mui/material";
import { Messages } from "openai/resources/beta/threads/messages";
import Button from '@mui/material/Button';


export default function Home() {
const [messages,setMessages] = useState([
  {role: "assistant", content: "Hi I am your CampFinder Support Assistant. I can help you find info on all the camps we offer on our platform"}
])

const sendMessage = async() => {
  setMessage('')
  setMessages(
    (messages) =>
    [...messages, {role: "user", content:message},{role: "assistant", content: ""}])
  const response = fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": 'application/json',

    },
    body: JSON.stringify([...messages, {role: "user", content: message}]),

  }).then((res) => {
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let result = ''
    return reader.read().then(function processText({done,value}) {
      if(done) {
        return result
      }
      const text = decoder.decode(value || new Uint8Array(), {stream: true})
      console.log(text)
      setMessages((messages) => {
        let lastMessage = messages[messages.length - 1]
        let otherMessage = messages.slice(0,messages.length-1)
        return [...otherMessage,
         {...lastMessage, content: lastMessage.content + text}
        
     ] })
      return reader.read().then(processText)
    })
  })


}

const[message, setMessage] = useState('')
  return (
   <Box width = "100vw" height = "100vh" display = "flex" flexDirection="column" justifyContent="center" alignItems={"center"}>


    <Stack direction = "column" width = "500px" height = "700px" border = "1px solid black"  p = {2} spacing={3}    sx={{
        width: {
          xs: '100%', // 100% width on extra-small screens
          sm: '80%',  // 80% width on small screens
          md: '70%',  // 70% width on medium screens
          lg: '60%',  // 60% width on large screens
          xl: '50%'   // 50% width on extra-large screens
        },
      
      }} >
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
