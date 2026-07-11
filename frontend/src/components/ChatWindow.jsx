import { useEffect, useRef, useState } from 'react'
import MessageBubble from './MessageBubble.jsx'
import { askQuestionStream } from '../api.js'

export default function ChatWindow({ activeSource, hasDocuments }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const question = input.trim()
    if (!question || busy) return

    setInput('')
    setMessages((m) => [...m, { role: 'user', content: question }])
    setMessages((m) => [...m, { role: 'assistant', content: '', sources: [], streaming: true }])
    setBusy(true)

    try {
      await askQuestionStream(question, activeSource, (event) => {
        if (event.type === 'sources') {
          setMessages((m) => {
            const copy = [...m]
            copy[copy.length - 1] = { ...copy[copy.length - 1], sources: event.sources }
            return copy
          })
        } else if (event.type === 'token') {
          setMessages((m) => {
            const copy = [...m]
            const last = copy[copy.length - 1]
            copy[copy.length - 1] = { ...last, content: last.content + event.content }
            return copy
          })
        } else if (event.type === 'done') {
          setMessages((m) => {
            const copy = [...m]
            copy[copy.length - 1] = { ...copy[copy.length - 1], streaming: false }
            return copy
          })
        }
      })
    } catch (e) {
      setMessages((m) => {
        const copy = [...m]
        copy[copy.length - 1] = {
          role: 'assistant',
          content: e.message || 'Something went wrong talking to the local model.',
          error: true,
          streaming: false,
        }
        return copy
      })
    } finally {
      setBusy(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const saveChat = () => {
    const lines = messages.map((m) => {
      if (m.role === 'user') return `You: ${m.content}`
      let text = `Assistant: ${m.content}`
      if (m.sources && m.sources.length > 0) {
        text += '\n' + m.sources.map((s) => `  Source: ${s.source} · p.${s.page}`).join('\n')
      }
      return text
    })
    const blob = new Blob([lines.join('\n\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="chat-area">
      <div className="chat-header">
        <div className="chat-title">Reading room</div>
        <div className="chat-header-actions">
          {activeSource && <div className="chat-filter">filtered to {activeSource}</div>}
          <button className="save-chat-btn" onClick={saveChat} disabled={messages.length === 0}>
            Save chat
          </button>
        </div>
      </div>

      <div className="chat-scroll" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <h2>{hasDocuments ? 'Ask something' : 'Upload a document to begin'}</h2>
            <p>
              {hasDocuments
                ? 'Questions are answered only from what your documents actually say — with the exact passages shown alongside each answer.'
                : 'Add a PDF, TXT, MD, or DOCX file in the sidebar, then ask anything about it.'}
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
      </div>

      <div className="input-bar">
        <div className="input-row">
          <textarea
            rows={1}
            placeholder={hasDocuments ? 'Ask a question about your documents…' : 'Upload a document first…'}
            value={input}
            disabled={!hasDocuments || busy}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="send-btn" onClick={send} disabled={!hasDocuments || busy || !input.trim()}>
            {busy ? 'Thinking…' : 'Ask'}
          </button>
        </div>
        <div className="input-hint">Enter to send · Shift+Enter for a new line</div>
      </div>
    </div>
  )
}
