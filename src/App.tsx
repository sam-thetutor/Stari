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

  useEffect(() => {
    fetchHistory()
  }, [])

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
    if (!message.trim()) return
    
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
    <div className="app-container">
      <div className="chat-interface">
        <header className="chat-header">
          <h1>Stellar AI Assistant</h1>
          <button 
            onClick={handleClear} 
            className="clear-button"
            disabled={loading || history.length === 0}
          >
            Clear Chat
          </button>
        </header>

        <div className="messages-container" ref={chatContainerRef}>
          {history.length === 0 && (
            <div className="welcome-message">
              <h2>Welcome! 👋</h2>
              <p>You can ask me about:</p>
              <ul>
                <li>Checking your Stellar wallet balance</li>
                <li>Sending tokens to other addresses</li>
                <li>Information about your transactions</li>
              </ul>
            </div>
          )}
          
          {history.map((msg, index) => (
            <div 
              key={index} 
              className={`message ${msg.type === 'human' ? 'user-message' : 'ai-message'}`}
            >
              <div className="message-content">
                {msg.content}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="message ai-message">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
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
          <button type="submit" disabled={loading || !message.trim()}>
            {loading ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default App
