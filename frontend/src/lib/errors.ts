import axios from 'axios'

export function getApiErrorMessage(error: unknown, fallback = 'Request failed'): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') return detail[0].msg
    if (typeof error.message === 'string' && error.message) return error.message
  }
  return error instanceof Error ? error.message : fallback
}
