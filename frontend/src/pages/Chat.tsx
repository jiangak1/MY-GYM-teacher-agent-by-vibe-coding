import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Mic, MicOff, Loader2, Volume2, VolumeX, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useChatStore } from '../stores/chatStore'
import { cn } from '../lib/utils'

export default function Chat() {
  const { messages, isLoading, sendMessage, loadHistory } = useChatStore()
  const navigate = useNavigate()
  const [input, setInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(false)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // TTS: speak text, returns a Promise that resolves when audio finishes
  const speakText = useCallback(async (text: string, msgId: string) => {
    try {
      setSpeakingId(msgId)
      const response = await fetch('/api/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'default-user' },
        body: JSON.stringify({ text }),
      })
      if (!response.ok) {
        // TTS server not available — fail silently, show icon feedback
        setSpeakingId(null)
        return
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      if (audioRef.current) {
        audioRef.current.src = url
        audioRef.current.onended = () => {
          URL.revokeObjectURL(url)
          setSpeakingId(null)
        }
        audioRef.current.onerror = () => {
          URL.revokeObjectURL(url)
          setSpeakingId(null)
        }
        await audioRef.current.play()
      } else {
        URL.revokeObjectURL(url)
        setSpeakingId(null)
      }
    } catch {
      setSpeakingId(null)
    }
  }, [])

  // Auto-speak when a new AI message arrives
  useEffect(() => {
    if (!autoSpeak || messages.length === 0) return
    const lastMsg = messages[messages.length - 1]
    if (lastMsg.role === 'assistant' && lastMsg.content && !isLoading) {
      speakText(lastMsg.content, lastMsg.id)
    }
  }, [messages, autoSpeak, isLoading, speakText])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return
    const msg = input.trim()
    setInput('')
    await sendMessage(msg)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="max-w-3xl mx-auto h-full flex flex-col">
      {/* Hidden audio element for TTS playback */}
      <audio ref={audioRef} className="hidden" />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 flex items-center justify-between"
      >
        <div>
          <h1 className="text-xl font-semibold">AI 健康教练</h1>
          <p className="text-sm text-muted-foreground">语音对话 · 健康建议 · 情绪陪伴</p>
        </div>
        <button
          onClick={() => setAutoSpeak(!autoSpeak)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all',
            autoSpeak
              ? 'bg-accent/15 text-accent border border-accent/30'
              : 'text-muted-foreground border border-card-border hover:text-foreground',
          )}
          title={autoSpeak ? '自动语音播报已开启' : '自动语音播报已关闭'}
        >
          {autoSpeak ? (
            <>
              <Volume2 className="w-4 h-4" />
              语音中
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4" />
              静音
            </>
          )}
        </button>
      </motion.div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring' }}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-info/20 flex items-center justify-center mb-4"
            >
              <span className="text-2xl">🏥</span>
            </motion.div>
            <h2 className="text-lg font-medium mb-2">你好，我是小安</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              你的私人AI健康教练。你可以打字或语音输入，
              我会用语音回复你。
            </p>
            <div className="flex gap-2 mt-4">
              {['今天状态怎么样？', '给我看看碳循环方案', '帮我分析一下恢复情况'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => sendMessage(suggestion)}
                  className="text-xs text-muted-foreground bg-glass border border-card-border rounded-full px-3 py-1.5 hover:text-foreground hover:border-accent/30 transition-colors"
                >
                  {suggestion.length > 12 ? suggestion.slice(0, 12) + '...' : suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className={cn(
                'flex gap-3',
                msg.role === 'user' ? 'justify-end' : 'justify-start',
              )}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent/20 to-info/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-xs">🏥</span>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <div
                  className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-accent/15 border border-accent/20 rounded-br-md'
                      : 'glass-sm rounded-bl-md',
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.toolCalls && msg.toolCalls.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-card-border space-y-2">
                      <span className="text-xs text-muted-foreground">
                        🔧 使用了 {msg.toolCalls.length} 个工具
                      </span>
                      {msg.toolCalls.some((tc) => tc.name === 'generate_carbon_cycle') && (
                        <button
                          onClick={() => navigate('/carbon')}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors w-fit"
                        >
                          <ExternalLink className="w-3 h-3" />
                          查看碳循环方案
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {/* TTS speak button for AI messages */}
                {msg.role === 'assistant' && msg.content && (
                  <button
                    onClick={() => speakText(msg.content, msg.id)}
                    disabled={speakingId === msg.id}
                    className={cn(
                      'self-start flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all',
                      speakingId === msg.id
                        ? 'text-accent bg-accent/10'
                        : 'text-muted-foreground/50 hover:text-accent hover:bg-accent/5',
                    )}
                  >
                    <Volume2 className={cn('w-3 h-3', speakingId === msg.id && 'animate-pulse-soft')} />
                    {speakingId === msg.id ? '播报中...' : '语音播报'}
                  </button>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-xs">👤</span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            正在思考...
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex items-center gap-2 p-3 glass-sm">
        <button
          onClick={() => setIsRecording(!isRecording)}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
            isRecording
              ? 'bg-danger/20 text-danger animate-pulse-soft'
              : 'text-muted-foreground hover:text-foreground',
          )}
          title={isRecording ? '停止录音' : '语音输入 (faster-whisper)'}
        >
          {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息，或点击麦克风语音输入..."
          className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground/50"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="w-10 h-10 rounded-xl bg-accent text-accent-foreground flex items-center justify-center disabled:opacity-30 transition-opacity"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
