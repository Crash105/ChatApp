"use client"
import { useEffect, useState } from "react";
import { Box, Stack, TextField, Typography} from "@mui/material";
import { Messages } from "openai/resources/beta/threads/messages";
import Button from '@mui/material/Button';
import { useAuthState } from "react-firebase-hooks/auth";
import { firestore, auth } from "@/src/firebase";
import {
  collection,
  query,
  getDocs,
  setDoc,
  doc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import {  useRouter } from "next/navigation";
import { signOut } from "firebase/auth";




export default function Home() {
const [messages,setMessages] = useState([
  {role: "assistant", content: "Hi I am your CampFinder Support Assistant. I can help you find info on all the camps we offer on our platform"}
])

const [user, userLoading, error] = useAuthState(auth);
const router = useRouter();
const [checking, setChecking] = useState(true); // Start as true
const [hasPDF1, setHasPDF] = useState(false);
const [upload, setUpload] = useState(false);
const[message, setMessage] = useState('')

useEffect(() => {

 

    async function checkPdF() {

      if (!user) {
      router.push('/login');
      return;
    }
      const docRef=  query(collection(firestore, "users", user.uid, "pdfInput"))
      const docSnap = await getDocs(docRef)
      
      
      if(docSnap.empty) {
          router.push("/PDFPage")   
          setUpload(true) 
          return;
      }
      else {
        setHasPDF(true)
        setChecking(false)
      }
      
    }
    checkPdF();
  

}, [user, userLoading, router]);

const sendMessage = async() => {
  const newUserMessage = { role: "user", content: message };
  const newAssistantPlaceholder = { role: "assistant", content: "" };

  const updatedMessages = [...messages, newUserMessage, newAssistantPlaceholder];

  setMessages(updatedMessages);
  setMessage('');

 
  const response = fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": 'application/json',},
    body: JSON.stringify([...messages, newUserMessage ]),

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

const logOut = async() => {

    await signOut(auth)

  }

  const pdfupload = () => {

    router.push("/PDFPage")   

  }

if(userLoading || checking) {return <div>Loading...</div> }



if(!user) {
  return null
}

if(upload) {
  
}



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
<Button variant = "contained" onClick={sendMessage} >Sent</Button>
<Button variant="contained" onClick={logOut}>
        LogOut
      </Button>
      <Button variant="contained" onClick={pdfupload}>
        PDF Upload
      </Button>
</Stack>
    </Stack>
   </Box>
   
  );
}
