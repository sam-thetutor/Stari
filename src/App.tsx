import { useState, useEffect, useRef } from 'react'
import './App.css'

interface Message {
  type: 'human' | 'ai'
  content: string
}

function App() {
  const [message, setMessage] = useState('')
  const [history, setHistory] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Fetch conversation history on component mount
  useEffect(() => {
    fetchHistory()
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [history, loading])

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:3030/history')
      const data = await res.json()
      setHistory(data.history)
    } catch (error) {
      console.error('Error fetching history:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('http://localhost:3030/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      })

      const data = await res.json()
      setHistory(data.history)
      setMessage('')
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = async () => {
    try {
      await fetch('http://localhost:3030/clear', { method: 'POST' })
      setHistory([])
    } catch (error) {
      console.error('Error clearing history:', error)
    }
  }

  return (
    <div className="container">
      <h1>Stellar Blockchain AI Assistant</h1>
      
      <div className="chat-container" ref={chatContainerRef}>
        {history.map((msg, index) => (
          <div 
            key={index} 
            className={`message ${msg.type === 'human' ? 'user-message' : 'ai-message'}`}
          >
           
            <div className="message-content">
              <pre>{msg.content}</pre>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="loading-indicator">
            <div className="typing-animation">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask about your Stellar wallet..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !message}>
          {loading ? 'Processing...' : 'Send'}
        </button>
        <button type="button" onClick={handleClear} disabled={loading}>
          Clear Chat
        </button>
      </form>

    </div>
  )
}

export default App
