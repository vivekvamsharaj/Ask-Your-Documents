export default function MessageBubble({ message }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="message-row user">
        <div className="bubble user">
          <p>{message.content}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="message-row">
      <div className={`bubble assistant${message.error ? ' error' : ''}`}>
        <p>
          {message.content}
          {message.streaming && <span className="typing-cursor" />}
        </p>
      </div>

      {message.sources && message.sources.length > 0 && (
        <div className="marginalia">
          <div className="marginalia-label">Grounded in</div>
          {message.sources.map((s, i) => (
            <div className="source-note" key={i}>
              <span className="source-name">
                {s.source} · p.{s.page}
                {typeof s.relevance === 'number' ? ` · ${Math.round(s.relevance * 100)}%` : ''}
              </span>
              <span className="source-snippet">“{s.snippet}”</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
