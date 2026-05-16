// ============================================================
// STT Provider Abstraction
// ============================================================

export interface STTConfig {
  type: 'faster_whisper' | 'deepgram' | 'openai_whisper' | 'groq_whisper'
  apiKey?: string
  model?: string
  language?: string
}

export async function transcribe(
  audioBuffer: Buffer,
  config: STTConfig,
): Promise<{ text: string }> {
  switch (config.type) {
    case 'faster_whisper':
      return fasterWhisperTranscribe(audioBuffer, config)
    case 'deepgram':
      return deepgramTranscribe(audioBuffer, config)
    case 'openai_whisper':
      return openaiWhisperTranscribe(audioBuffer, config)
    case 'groq_whisper':
      return groqWhisperTranscribe(audioBuffer, config)
    default:
      throw new Error(`Unknown STT provider: ${config.type}`)
  }
}

async function detectPythonCommand(): Promise<string> {
  const { execSync } = await import('child_process')
  const candidates = ['python3', 'python', 'py']
  for (const cmd of candidates) {
    try {
      execSync(`${cmd} --version`, { stdio: 'pipe' })
      return cmd
    } catch { /* try next */ }
  }
  return 'python' // fallback
}

async function fasterWhisperTranscribe(
  buffer: Buffer,
  config: STTConfig,
): Promise<{ text: string }> {
  const { spawn } = await import('child_process')
  const { writeFile, unlink, access } = await import('fs/promises')
  const { tmpdir } = await import('os')
  const path = await import('path')
  const { fileURLToPath } = await import('url')

  const pythonCmd = await detectPythonCommand()

  // Resolve worker script path relative to the project root
  const projectRoot = path.resolve(process.cwd())
  const workerScript = path.join(projectRoot, 'stt-worker', 'worker.py')

  try {
    await access(workerScript)
  } catch {
    throw new Error(
      `STT worker not found at ${workerScript}. ` +
      'Please ensure stt-worker/worker.py exists in the project root.',
    )
  }

  const tempFile = path.join(tmpdir(), `stt-${Date.now()}.wav`)
  await writeFile(tempFile, buffer)

  return new Promise((resolve, reject) => {
    const proc = spawn(pythonCmd, [
      workerScript,
      '--file', tempFile,
      '--model', config.model || 'small',
      '--language', config.language || 'zh',
    ])

    let output = ''
    let errorOutput = ''

    proc.stdout.on('data', (data: Buffer) => { output += data.toString() })
    proc.stderr.on('data', (data: Buffer) => { errorOutput += data.toString() })

    proc.on('close', async (code: number) => {
      await unlink(tempFile).catch(() => {})
      if (code === 0) {
        try {
          const result = JSON.parse(output.trim())
          resolve({ text: result.text || '' })
        } catch {
          reject(new Error(`Failed to parse STT output: ${output}`))
        }
      } else {
        reject(new Error(`STT worker error (code ${code}): ${errorOutput || output}`))
      }
    })

    proc.on('error', async (err) => {
      await unlink(tempFile).catch(() => {})
      reject(new Error(
        `Cannot start Python (${pythonCmd}). ` +
        'Install Python 3 and faster-whisper: pip install faster-whisper soundfile numpy\n' +
        `Error: ${err.message}`,
      ))
    })
  })
}

async function deepgramTranscribe(
  buffer: Buffer,
  config: STTConfig,
): Promise<{ text: string }> {
  if (!config.apiKey) throw new Error('Deepgram API key required')
  const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2', {
    method: 'POST',
    headers: {
      Authorization: `Token ${config.apiKey}`,
      'Content-Type': 'audio/wav',
    },
    body: buffer,
  })
  const data = (await response.json()) as {
    results?: { channels?: { alternatives?: { transcript: string }[] }[] }
  }
  const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
  return { text: transcript }
}

async function openaiWhisperTranscribe(
  buffer: Buffer,
  config: STTConfig,
): Promise<{ text: string }> {
  if (!config.apiKey) throw new Error('OpenAI API key required')
  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({ apiKey: config.apiKey })
  const { writeFile, unlink } = await import('fs/promises')
  const { tmpdir } = await import('os')
  const path = await import('path')
  const { default: fs } = await import('fs')

  const tempFile = path.join(tmpdir(), `stt-openai-${Date.now()}.webm`)
  await writeFile(tempFile, buffer)

  const transcription = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file: fs.createReadStream(tempFile),
    language: config.language || 'zh',
  })

  await unlink(tempFile).catch(() => {})
  return { text: transcription.text }
}

async function groqWhisperTranscribe(
  buffer: Buffer,
  config: STTConfig,
): Promise<{ text: string }> {
  if (!config.apiKey) throw new Error('Groq API key required')
  const formData = new FormData()
  formData.append('file', new Blob([buffer]), 'audio.wav')
  formData.append('model', config.model || 'whisper-large-v3')
  formData.append('language', config.language || 'zh')

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}` },
    body: formData,
  })
  const data = (await response.json()) as { text?: string }
  return { text: data.text || '' }
}
