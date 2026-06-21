'use client'
import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { firestore, auth, storage } from "@/src/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  CircularProgress,
  Container,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PDFsPage() {
  const [user, userLoading] = useAuthState(auth);
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const router = useRouter();

  useEffect(() => {
    if (userLoading) return;
    if (!user) { router.push('/login'); return; }

    async function loadPdfs() {
      const snap = await getDocs(collection(firestore, 'users', user.uid, 'pdfInput'));
      setPdfs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }
    loadPdfs();
  }, [user, userLoading, router]);

  const handleDelete = async (pdf) => {
    setDeleting(pdf.id);
    try {
      if (pdf.vectorIds.length) {
        await fetch('/api/pinecone', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vectorIds: pdf.vectorIds, userid: user.uid }),
        });
      }

      if (pdf.storagePath) {
        await deleteObject(ref(storage, pdf.storagePath));
      }

      await deleteDoc(doc(firestore, 'users', user.uid, 'pdfInput', pdf.id));
      setPdfs(prev => prev.filter(p => p.id !== pdf.id));
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeleting(null);
    }
  };

  if (userLoading || loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">My PDFs</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={() => router.push('/PDFPage')}>Upload New</Button>
          <Button variant="contained" onClick={() => router.push('/website')}>Back to Chat</Button>
        </Stack>
      </Stack>

      {pdfs.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No PDFs uploaded yet.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Name</strong></TableCell>
                <TableCell><strong>Size</strong></TableCell>
                <TableCell><strong>Uploaded</strong></TableCell>
                <TableCell align="center"><strong>Delete</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pdfs.map(pdf => (
                <TableRow key={pdf.id}>
                  <TableCell>
                    <a href={pdf.url} target="_blank" rel="noreferrer">{pdf.name}</a>
                  </TableCell>
                  <TableCell>{pdf.size ? formatBytes(pdf.size) : '—'}</TableCell>
                  <TableCell>
                    {pdf.uploadedAt?.toDate
                      ? pdf.uploadedAt.toDate().toLocaleDateString()
                      : '—'}
                  </TableCell>
                  <TableCell align="center">
                    {deleting === pdf.id ? (
                      <CircularProgress size={20} />
                    ) : (
                      <IconButton color="error" onClick={() => handleDelete(pdf)}>
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
}
