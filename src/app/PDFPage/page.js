'use client'
import { useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { firestore, auth, storage} from "@/src/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function UploadPage() {

  const router = useRouter()

  const [pdffiles, setPDFFiles] = useState([]);
  const [errors, setErrors] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [user] = useAuthState(auth);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
    setPDFFiles(files);
  };

  const processFile = async (pdffile) => {
    const timestamp = Date.now();

    const storageRef = ref(storage, `users/${user.uid}/pdfs/${timestamp}_${pdffile.name}`);
    const snapshot = await uploadBytes(storageRef, pdffile);
    const downloadURL = await getDownloadURL(snapshot.ref);

    const colRef = collection(firestore, 'users', user.uid, 'pdfInput');
    await addDoc(colRef, {
      name: pdffile.name,
      url: downloadURL,
      size: pdffile.size,
      uploadedAt: new Date(),
    });

    const formData = new FormData();
    formData.append('file', pdffile);
    const res = await fetch("/api/chunk", { method: "POST", body: formData });
    if (!res.ok) throw new Error(`Chunking failed (${res.status})`);
    const data = await res.json();
    const chunks = data.result;

    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: chunks.map(chunk => chunk.pageContent) }),
    });
    if (!response.ok) throw new Error(`Embeddings failed (${response.status})`);
    const data1 = await response.json();
    const answer1 = data1.embeddings;

    const embeddingsresult = answer1.data.map((item) => ({
      id: `${user.uid}-${timestamp}-${item.index}`,
      values: item.embedding,
      metadata: {
        text: chunks[item.index].pageContent,
        url: downloadURL
      }
    }));

    const response1 = await fetch('/api/pinecone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: embeddingsresult, userid: user.uid }),
    });
    if (!response1.ok) throw new Error(`Pinecone upload failed (${response1.status})`);

    const data2 = await response1.json();
    console.log(data2.status);
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
    <div>
      <input
        type="file"
        accept="application/pdf"
        multiple
        onChange={handleFileSelect}
      />
      {pdffiles.length > 0 && <p>Selected: {pdffiles.map(f => f.name).join(', ')}</p>}
      <button onClick={handleSubmit} disabled={uploading || pdffiles.length === 0}>
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
      {errors.length > 0 && errors.map((e, i) => <p key={i} style={{ color: 'red' }}>{e}</p>)}
    </div>
  );
}
