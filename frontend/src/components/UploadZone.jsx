import { useRef, useState } from 'react'

export default function UploadZone({ onUpload, uploading, uploadProgress }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')

  const handleFiles = (files) => {
    setError('')
    const file = files[0]
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf', 'txt', 'md', 'docx'].includes(ext)) {
      setError(`.${ext} isn't supported yet — try PDF, TXT, MD, or DOCX.`)
      return
    }
    onUpload(file).catch((e) => setError(e.message))
  }

  return (
    <div>
      <div
        className={`upload-zone${dragging ? ' dragging' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
      >
        <div className="upload-zone-title">
          {uploading ? 'Indexing…' : 'Drop a document, or click to browse'}
        </div>
        <div className="upload-zone-hint">PDF · TXT · MD · DOCX</div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.txt,.md,.docx"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {uploading && (
        <div className="progress-bar" role="progressbar" aria-valuenow={uploadProgress} aria-valuemin="0" aria-valuemax="100">
          <div className="progress-bar-fill" style={{ '--progress': `${uploadProgress}%` }} />
          <span className="progress-bar-label">{uploadProgress}%</span>
        </div>
      )}
      {error && <div className="upload-error">{error}</div>}
    </div>
  )
}
