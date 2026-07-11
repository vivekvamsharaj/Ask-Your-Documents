const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function parseError(res, fallback) {
  try {
    const data = await res.json()
    return data.detail || fallback
  } catch {
    return fallback
  }
}

export function uploadDocument(file, onProgress) {
  const formData = new FormData()
  formData.append('file', file)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE_URL}/upload`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      let data = {}
      try {
        data = JSON.parse(xhr.responseText)
      } catch {
        // non-JSON response
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data)
      } else {
        reject(new Error(data.detail || 'Upload failed'))
      }
    }

    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.send(formData)
  })
}

export async function fetchDocuments() {
  const res = await fetch(`${BASE_URL}/documents`)
  if (!res.ok) throw new Error(await parseError(res, 'Failed to load documents'))
  return res.json()
}

export async function deleteDocument(source) {
  const res = await fetch(`${BASE_URL}/documents/${encodeURIComponent(source)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await parseError(res, 'Failed to delete document'))
  return res.json()
}

export async function checkHealth() {
  const res = await fetch(`${BASE_URL}/health`)
  if (!res.ok) throw new Error('Backend unreachable')
  return res.json()
}

/**
 * Streams an answer via Server-Sent Events.
 * onEvent receives { type: 'sources' | 'token' | 'done', ... }
 */
export async function askQuestionStream(question, source, onEvent) {
  const res = await fetch(`${BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, source: source || null }),
  })
  if (!res.ok || !res.body) {
    throw new Error(await parseError(res, 'Request failed'))
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop()
    for (const evt of events) {
      const line = evt.trim()
      if (line.startsWith('data: ')) {
        try {
          onEvent(JSON.parse(line.slice(6)))
        } catch {
          // skip malformed chunk
        }
      }
    }
  }
}
