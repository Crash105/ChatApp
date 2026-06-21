'use client'
import { useState, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { firestore, auth, storage } from "@/src/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DeleteIcon from "@mui/icons-material/Delete";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [pdffiles, setPDFFiles] = useState([]);
  const [errors, setErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [user] = useAuthState(auth);

  const addFiles = (incoming) => {
    const pdfs = Array.from(incoming).filter(f => f.type === 'application/pdf');
    setPDFFiles(prev => {
      const existingNames = new Set(prev.map(f => f.name));
      return [...prev, ...pdfs.filter(f => !existingNames.has(f.name))];
    });
  };

  const handleFileSelect = (e) => addFiles(e.target.files);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (name) => setPDFFiles(prev => prev.filter(f => f.name !== name));

  const processFile = async (pdffile) => {
    const timestamp = Date.now();
    const storagePath = `users/${user.uid}/pdfs/${timestamp}_${pdffile.name}`;

    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, pdffile);
    const downloadURL = await getDownloadURL(snapshot.ref);

    const colRef = collection(firestore, 'users', user.uid, 'pdfInput');
    const docRef = await addDoc(colRef, {
      name: pdffile.name,
      url: downloadURL,
      storagePath,
      size: pdffile.size,
      uploadedAt: new Date(),
    });

    const formData = new FormData();
    formData.append('file', pdffile);
    const res = await fetch("/api/chunk", { method: "POST", body: formData });
    if (!res.ok) throw new Error(`Chunking failed (${res.status})`);
    const { result: chunks } = await res.json();

    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: chunks.map(chunk => chunk.pageContent) }),
    });
    if (!response.ok) throw new Error(`Embeddings failed (${response.status})`);
    const { embeddings } = await response.json();

    const embeddingsresult = embeddings.data.map((item) => ({
      id: `${user.uid}-${timestamp}-${pdffile.name}-${item.index}`,
      values: item.embedding,
      metadata: { text: chunks[item.index].pageContent, url: downloadURL },
    }));

    const response1 = await fetch('/api/pinecone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: embeddingsresult, userid: user.uid }),
    });
    if (!response1.ok) throw new Error(`Pinecone upload failed (${response1.status})`);

    await updateDoc(docRef, { vectorIds: embeddingsresult.map((e) => e.id) });
  };

  const handleSubmit = async () => {
    if (pdffiles.length === 0) return;
    setUploading(true);
    setErrors([]);

    const results = await Promise.allSettled(pdffiles.map(file => processFile(file)));
    const failed = results
      .map((result, i) => result.status === 'rejected' ? `${pdffiles[i].name}: ${result.reason.message}` : null)
      .filter(Boolean);

    setUploading(false);

    if (failed.length > 0) {
      setErrors(failed);
    } else {
      router.push("/website");
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" fontWeight="bold">Upload PDFs</Typography>
          <Button variant="text" onClick={() => router.push('/website')}>Back to Chat</Button>
        </Stack>

        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'info.50', borderColor: 'info.main' }}>
          <Typography variant="body2" color="text.secondary">
            To start chatting, upload at least one PDF. The chatbot will only answer questions based on the documents you provide.
          </Typography>
        </Paper>

        {/* Drop zone */}
        <Paper
          variant="outlined"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          sx={{
            p: 5,
            textAlign: 'center',
            cursor: 'pointer',
            borderStyle: 'dashed',
            borderWidth: 2,
            borderColor: dragOver ? 'primary.main' : 'divider',
            bgcolor: dragOver ? 'action.hover' : 'background.paper',
            transition: 'all 0.15s',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <UploadFileIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
          <Typography variant="body1" fontWeight="medium">
            Drag & drop PDFs here
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            or click to browse
          </Typography>
        </Paper>

        {/* Selected files list */}
        {pdffiles.length > 0 && (
          <Paper variant="outlined">
            <List disablePadding>
              {pdffiles.map((file, i) => (
                <ListItem
                  key={file.name}
                  divider={i < pdffiles.length - 1}
                  secondaryAction={
                    !uploading && (
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => removeFile(file.name)}
                      >
                        Remove
                      </Button>
                    )
                  }
                >
                  <ListItemIcon>
                    <PictureAsPdfIcon color="error" />
                  </ListItemIcon>
                  <ListItemText
                    primary={file.name}
                    secondary={formatBytes(file.size)}
                    primaryTypographyProps={{ noWrap: true, maxWidth: 260 }}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <Stack spacing={1}>
            {errors.map((e, i) => (
              <Chip key={i} label={e} color="error" variant="outlined" />
            ))}
          </Stack>
        )}

        {/* Upload button */}
        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={uploading || pdffiles.length === 0}
          onClick={handleSubmit}
          startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : null}
        >
          {uploading ? 'Processing…' : `Upload ${pdffiles.length > 0 ? `${pdffiles.length} file${pdffiles.length > 1 ? 's' : ''}` : ''}`}
        </Button>
      </Stack>
    </Container>
  );
}
