import { useEffect, useState, useCallback } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChatWindow from './components/ChatWindow.jsx'
import { checkHealth, deleteDocument, fetchDocuments, uploadDocument } from './api.js'

export default function App() {
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [online, setOnline] = useState(true)
  const [activeSource, setActiveSource] = useState(null)

  const refreshDocuments = useCallback(async () => {
    try {
      const data = await fetchDocuments()
      setDocuments(data.documents)
    } catch {
      // handled by health check
    }
  }, [])

  useEffect(() => {
    refreshDocuments()
    const poll = async () => {
      try {
        await checkHealth()
        setOnline(true)
      } catch {
        setOnline(false)
      }
    }
    poll()
    const id = setInterval(poll, 15000)
    return () => clearInterval(id)
  }, [refreshDocuments])

  const handleUpload = async (file) => {
    setUploading(true)
    setUploadProgress(0)
    try {
      await uploadDocument(file, setUploadProgress)
      await refreshDocuments()
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleDelete = async (source) => {
    await deleteDocument(source)
    if (activeSource === source) setActiveSource(null)
    await refreshDocuments()
  }

  return (
    <div className="app-shell">
      <Sidebar
        documents={documents}
        onUpload={handleUpload}
        onDelete={handleDelete}
        uploading={uploading}
        uploadProgress={uploadProgress}
        online={online}
        activeSource={activeSource}
        onSelectSource={setActiveSource}
      />
      <ChatWindow activeSource={activeSource} hasDocuments={documents.length > 0} />
    </div>
  )
}
