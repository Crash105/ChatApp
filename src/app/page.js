"use client"

import { useState } from "react";
import { Box, Stack, TextField,  Typography} from "@mui/material";
import { Messages } from "openai/resources/beta/threads/messages";
import Button from '@mui/material/Button';
import Link from 'next/link';

export default function LandingPage() {
    return (
        <Box width = "100vw" height = "100vh" display = "flex" flexDirection="column" justifyContent="center" alignItems={"center"}  >
          <Stack  textAlign = "center" alignItems={"center"} gap = {1}  sx={{
        width: {
          xs: '100%', // 100% width on extra-small screens
          sm: '80%',  // 80% width on small screens
          md: '70%',  // 70% width on medium screens
          lg: '60%',  // 60% width on large screens
          xl: '50%'   // 50% width on extra-large screens
        },
        
      
      }}
      
      >
                <Typography 
  variant="h3"
  sx={{
    background: 'linear-gradient(90deg, #0000FF, #00FFFF)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    MozBackgroundClip: 'text',
    MozTextFillColor: 'transparent',
  }}
>
   GridIronCamp AI
  </Typography>
  <Typography
  variant="h5"
  sx={{
    background: 'linear-gradient(90deg, #0000FF, #00FFFF)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    MozBackgroundClip: 'text',
    MozTextFillColor: 'transparent',
  }}
>
   AI Football Camp Locater
  </Typography>
  <Typography
  variant="h5"
 
>
  We Help Highschool Students Easily Find Football Camps in United States through RAG AI Chatbot
  </Typography>
  </Stack>
  <Link href="/website" passHref legacyBehavior>
        <Button variant="contained" color="primary">
          Find a Camp
        </Button>
      </Link>
    
  </Box>

    );
  }