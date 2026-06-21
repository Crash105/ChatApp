"use client"
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Box, Stack, TextField, Typography} from "@mui/material";
import Button from '@mui/material/Button';
import { useAuthState } from "react-firebase-hooks/auth";
import { firestore, auth } from "@/src/firebase";
import {
  collection,
  query as firestoreQuery,
  orderBy,
  limit,
  getDocs,
  addDoc,
} from "firebase/firestore";
import {  useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import Login from "../login/page";
import { useCollectionData } from 'react-firebase-hooks/firestore';



export default function Home() {

const [user, userLoading, error] = useAuthState(auth);
const router = useRouter();
const [checking, setChecking] = useState(true);
const [message, setMessage] = useState('')
const [streamingContent, setStreamingContent] = useState(null)

const messagesRef = user ? collection(firestore, "users", user.uid, "messages") : null;
const messagesQuery = messagesRef ? firestoreQuery(messagesRef, orderBy('timestamp'), limit(25)) : null;

const [messages = []] = useCollectionData(messagesQuery, { idField: 'id' });


useEffect(() => {
    async function checkPdF() {
      if (!user) {
      router.push('/login');
      return;
    }
      const docRef= collection(firestore, "users", user.uid, "pdfInput")
      const docSnap = await getDocs(docRef)
      
      
      if(docSnap.empty) {
          router.push("/PDFPage")
          return;
      }
      else {
        setChecking(false)
      }
    }
    checkPdF();
}, [user, userLoading, router]);

const sendMessage = async () => {

  try {
  const newUserMessage = { role: "user", content: message };
  setMessage('');

  await addDoc(messagesRef, { ...newUserMessage, timestamp: new Date() });

  let assistantContent = '';
  setStreamingContent('');

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [...messages, newUserMessage], userid: user.uid }),
  });
  if (!res.ok) throw new Error(`Chatt failed to generate text(${res.status})`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value || new Uint8Array(), { stream: true });
    assistantContent += text;
    setStreamingContent(assistantContent);
  }
   const newChatMessage = {role: 'assistant', content: assistantContent };
  await addDoc(messagesRef, {...newChatMessage, timestamp: new Date() });
  setStreamingContent(null);
}catch(err) {

}
}

const logOut = async() => {

    await signOut(auth)

  }

  const pdfupload = () => {

    router.push("/PDFPage")   

  }

if(userLoading || checking) {return <div>Loading...</div> }
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
      <Box key={index} display="flex" justifyContent={message.role === "assistant" ? "flex-start" : 'flex-end'}>
        <Box bgcolor={message.role === 'assistant' ? 'primary.main' : 'secondary.main'} color="white" borderRadius={16} p={5}>
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </Box>
      </Box>
    ))}
    {streamingContent !== null && (
      <Box display="flex" justifyContent="flex-start">
        <Box bgcolor="primary.main" color="white" borderRadius={16} p={5}>
          <ReactMarkdown>{streamingContent}</ReactMarkdown>
        </Box>
      </Box>
    )}
    
    </Stack>
   <Stack direction = "row" spacing = {2}>
<TextField label = "Message" fullWidth value = {message} onChange={(e) => setMessage(e.target.value)}></TextField>
<Button variant = "contained" onClick={sendMessage} >Send</Button>
<Button variant="contained" onClick={logOut}>
        LogOut
      </Button>
      <Button variant="contained" onClick={pdfupload}>
        PDF Upload
      </Button>
      <Button variant="contained" onClick={() => router.push('/pdfs')}>
        My PDFs
      </Button>
</Stack>
    </Stack>
   </Box>
   
  );
}
