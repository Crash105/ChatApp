'use client'
import { useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { firestore, auth, storage} from "@/src/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc } from "firebase/firestore";
import { usePathname, useRouter } from "next/navigation";




export default function UploadPage() {

  const router = useRouter()

  const [pdffile, setPDFFile] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [user, userLoading] = useAuthState(auth);

  const handleFileSelect = (e) => {
        const file = e.target.files[0]
        console.log("File" + file)

        setPDFFile(file)
};

const handleSubmit = async() => {

  if (!pdffile) return;
  if (pdffile.type !== 'application/pdf') {
      setError('Invalid file type');
      return;
    }

  try {
      setUploading(true);

      // 1. Upload to Firebase Storage
      const storageRef = ref(storage, `users/${user.uid}/pdfs/${pdffile.name}`);
      const snapshot = await uploadBytes(storageRef, pdffile);
      const downloadURL = await getDownloadURL(snapshot.ref);

      // 2. Save metadata to Firestore
      const colRef = collection(firestore, 'users', user.uid, 'pdfInput');
      await addDoc(colRef, {
        name: pdffile.name,
        url: downloadURL,
        size: pdffile.size,
        uploadedAt: new Date(),
      });

  
      const formData = new FormData();
      formData.append('file' , pdffile)


      const res = await fetch("/api/chunk", {
      method: "POST",
    
      body: formData
    })

    const data = await res.json();
    const chunks = data.result;
    console.log(chunks)

    

    const response = await fetch('/api/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
        body: JSON.stringify({
        input: chunks.map(chunk => chunk.pageContent)

        }),
      });

      const data1 = await response.json();
      const answer1 = data1.embeddings;
      console.log(answer1)


    } catch (err) {
      console.error("Error during pdf to embeddings process", err);
      setError(err.message);
    } finally {
      setUploading(false);
      router.push("/website")
    }
}

  return (
  <div>
    <input
      type="file"
      accept="application/pdf"
      onChange={handleFileSelect}
    />
    {pdffile && <p>Selected: {pdffile.name}</p>}
    <button onClick={handleSubmit} disabled={uploading || !pdffile}>
      {uploading ? 'Uploading...' : 'Upload'}
    </button>
    {error && <p style={{ color: 'red' }}>{error}</p>}
  </div>
);
}