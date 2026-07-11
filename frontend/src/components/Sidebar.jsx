import UploadZone from './UploadZone.jsx'

export default function Sidebar({
  documents,
  onUpload,
  onDelete,
  uploading,
  uploadProgress,
  online,
  activeSource,
  onSelectSource,
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">Ask Your Documents</div>
        <div className="brand-sub">Retrieval-augmented Q&amp;A, running entirely on your machine</div>
      </div>

      <div className={`local-badge${online ? '' : ' offline'}`}>
        <span className="dot" />
        {online ? 'Ollama connected · local only' : 'Ollama unreachable'}
      </div>

      <div className="section-label">Add a document</div>
      <UploadZone onUpload={onUpload} uploading={uploading} uploadProgress={uploadProgress} />

      <div className="section-label">Library ({documents.length})</div>
      <div className="doc-list">
        {documents.length === 0 && (
          <div className="empty-hint">Nothing uploaded yet. Add a file to start asking questions.</div>
        )}
        {activeSource && (
          <div
            className="doc-item"
            onClick={() => onSelectSource(null)}
            style={{ background: 'var(--bg-card)', cursor: 'pointer' }}
          >
            <span className="doc-icon">ALL</span>
            <div className="doc-info">
              <div className="doc-name">Search all documents</div>
            </div>
          </div>
        )}
        {documents.map((doc) => (
          <div
            key={doc.source}
            className={`doc-item${activeSource === doc.source ? ' active' : ''}`}
            onClick={() => onSelectSource(activeSource === doc.source ? null : doc.source)}
            title="Filter questions to this document"
          >
            <span className="doc-icon">{doc.source.split('.').pop().toUpperCase()}</span>
            <div className="doc-info">
              <div className="doc-name">{doc.source}</div>
              <div className="doc-meta">{doc.chunks} chunks indexed</div>
            </div>
            <button
              className="doc-remove"
              title="Remove document"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(doc.source)
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </aside>
  )
}
