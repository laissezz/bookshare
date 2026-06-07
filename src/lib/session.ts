import { v4 as uuidv4 } from 'uuid'

export function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  const key = 'reader_session_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = uuidv4()
    localStorage.setItem(key, id)
  }
  return id
}
