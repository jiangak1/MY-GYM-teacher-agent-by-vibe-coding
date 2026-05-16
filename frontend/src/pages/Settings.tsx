import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Key, Cpu, Mic, Volume2, Palette, Save, Check } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { useSettingsStore } from '../stores/settingsStore'
import { cn } from '../lib/utils'

const chatProviders = [
  { value: 'claude', label: 'Claude (Anthropic)' },
  { value: 'openai', label: 'OpenAI (GPT-4o)' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'openai_compatible', label: 'OpenAI Compatible' },
]

const chatModels: Record<string, string[]> = {
  claude: ['claude-sonnet-4-6', 'claude-opus-4-7', 'claude-haiku-4-5-20251001'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'o3-mini'],
  deepseek: ['deepseek-chat', 'deepseek-v4-pro', 'deepseek-v4-flash'],
  gemini: ['gemini-2.0-flash', 'gemini-2.0-pro'],
  openai_compatible: ['custom-model'],
}

const sttProviders = [
  { value: 'faster_whisper', label: 'faster-whisper (本地免费)' },
  { value: 'deepgram', label: 'Deepgram' },
  { value: 'openai_whisper', label: 'OpenAI Whisper' },
  { value: 'groq_whisper', label: 'Groq Whisper' },
]

const ttsProviders = [
  { value: 'mimo_v2.5', label: 'MIMO-v2.5-tts' },
]

export default function Settings() {
  const { settings, fetchSettings, updateSettings } = useSettingsStore()
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    if (settings) {
      setApiKeys(settings.apiKeys || {})
    }
  }, [settings])

  const handleSave = async () => {
    if (!settings) return
    await updateSettings({
      chatProvider: settings.chatProvider,
      chatModel: settings.chatModel,
      sttProvider: settings.sttProvider,
      ttsProvider: settings.ttsProvider,
      apiKeys,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-semibold">设置</h1>
        <p className="text-sm text-muted-foreground mt-1">配置 AI Provider、API Key、语音等</p>
      </motion.div>

      {/* API Keys */}
      <Card delay={1}>
        <div className="flex items-center gap-2 mb-5">
          <Key className="w-5 h-5 text-accent" />
          <h3 className="font-medium">API Keys</h3>
          <span className="text-xs text-muted-foreground ml-2">本地加密存储</span>
        </div>
        <div className="space-y-4">
          {[
            { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key' },
            { key: 'OPENAI_API_KEY', label: 'OpenAI API Key' },
            { key: 'DEEPSEEK_API_KEY', label: 'DeepSeek API Key' },
            { key: 'GEMINI_API_KEY', label: 'Gemini API Key' },
            { key: 'DEEPGRAM_API_KEY', label: 'Deepgram API Key' },
            { key: 'GROQ_API_KEY', label: 'Groq API Key' },
            { key: 'USDA_API_KEY', label: 'USDA FoodData Central API Key' },
            { key: 'EXERCISEDB_API_KEY', label: 'ExerciseDB RapidAPI Key' },
            { key: 'MIMO_TTS_API_KEY', label: 'MIMO TTS API Key' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="text-sm text-muted-foreground mb-1.5 block">{label}</label>
              <input
                type="password"
                value={apiKeys[key] || ''}
                onChange={(e) => setApiKeys((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={key}
                className="w-full px-4 py-2.5 rounded-xl bg-glass border border-card-border text-sm outline-none focus:border-accent/50 transition-colors"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Chat Provider */}
      <Card delay={2}>
        <div className="flex items-center gap-2 mb-5">
          <Cpu className="w-5 h-5 text-accent" />
          <h3 className="font-medium">Chat Provider</h3>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Provider</label>
            <select
              value={settings?.chatProvider || 'claude'}
              onChange={(e) => {
                const newProvider = e.target.value
                const defaultModel = chatModels[newProvider]?.[0] || ''
                updateSettings({ chatProvider: newProvider as never, chatModel: defaultModel })
              }}
              className="w-full px-4 py-2.5 rounded-xl bg-glass border border-card-border text-sm outline-none focus:border-accent/50 transition-colors appearance-none"
            >
              {chatProviders.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Model</label>
            <select
              value={settings?.chatModel || ''}
              onChange={(e) => updateSettings({ chatModel: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-glass border border-card-border text-sm outline-none focus:border-accent/50 transition-colors appearance-none"
            >
              {(chatModels[settings?.chatProvider || 'claude'] || []).map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* STT / TTS */}
      <div className="grid grid-cols-2 gap-4">
        <Card delay={3}>
          <div className="flex items-center gap-2 mb-5">
            <Mic className="w-5 h-5 text-accent" />
            <h3 className="font-medium">语音转文字 (STT)</h3>
          </div>
          <select
            value={settings?.sttProvider || 'faster_whisper'}
            onChange={(e) => updateSettings({ sttProvider: e.target.value as never })}
            className="w-full px-4 py-2.5 rounded-xl bg-glass border border-card-border text-sm outline-none focus:border-accent/50 transition-colors appearance-none"
          >
            {sttProviders.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </Card>

        <Card delay={4}>
          <div className="flex items-center gap-2 mb-5">
            <Volume2 className="w-5 h-5 text-accent" />
            <h3 className="font-medium">文字转语音 (TTS)</h3>
          </div>
          <select
            value={settings?.ttsProvider || 'mimo_v2.5'}
            onChange={(e) => updateSettings({ ttsProvider: e.target.value as never })}
            className="w-full px-4 py-2.5 rounded-xl bg-glass border border-card-border text-sm outline-none focus:border-accent/50 transition-colors appearance-none"
          >
            {ttsProviders.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </Card>
      </div>

      {/* Save Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        onClick={handleSave}
        className={cn(
          'w-full py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2',
          saved
            ? 'bg-success/20 text-success'
            : 'bg-accent text-accent-foreground hover:bg-accent/90',
        )}
      >
        {saved ? (
          <>
            <Check className="w-4 h-4" />
            已保存
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            保存设置
          </>
        )}
      </motion.button>

      <p className="text-xs text-muted-foreground/50 text-center pb-6">
        所有数据存储在本地，API Keys 经 AES-256-GCM 加密
      </p>
    </div>
  )
}
