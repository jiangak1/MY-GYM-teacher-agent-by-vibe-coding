import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY_LENGTH = 32
const IV_LENGTH = 16
const TAG_LENGTH = 16

function deriveKey(): Buffer {
  const machineId = process.env.COMPUTERNAME || process.env.HOSTNAME || 'ai-health-default'
  return crypto.scryptSync(machineId, 'ai-health-salt', KEY_LENGTH)
}

export function encrypt(text: string): string {
  const key = deriveKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const result = Buffer.concat([iv, tag, encrypted])
  return result.toString('base64')
}

export function decrypt(encoded: string): string {
  const key = deriveKey()
  const buffer = Buffer.from(encoded, 'base64')
  const iv = buffer.subarray(0, IV_LENGTH)
  const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}
