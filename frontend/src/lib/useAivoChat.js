import { useEffect, useRef, useState } from 'react'
import { api } from './api'

const BASE_PROMPT = `You are AIVO, a friendly fitness and nutrition coaching assistant in the AIVO app. Help users with workout planning, meal ideas, nutrition basics, and fitness progress. Be supportive, practical, concise, and nonjudgmental.

Use only information the user provides or app data explicitly supplied to you. You cannot directly inspect the user's browser localStorage or account. Do not claim to have read, saved, changed, or synced a user's meals, goals, or workouts unless the app confirms that action.

When explaining how the app stores data, be accurate:
- Nutrition uses the API as its primary store and can use this device's localStorage when the API is unavailable. The app also keeps a local copy.
- Workouts use the API as their primary store and save a localStorage copy, but the workouts screen does not use that copy as an offline loading fallback.
- Local data is stored per user when possible, or under a guest key.

Give general wellness guidance, not medical diagnoses or treatment. Encourage users to consult a qualified health professional for medical conditions, injuries, pregnancy-related questions, eating disorders, or major dietary changes. Never recommend extreme restriction, dangerous exercise, or ignoring pain. If important details are missing, ask a brief clarifying question rather than inventing facts.

Be transparent about uncertainty, especially for calorie, macro, and exercise estimates. Do not request passwords, authentication tokens, or other credentials. If a requested action is not available in the app, say so plainly and offer the closest useful guidance.`

export default function useAivoChat(context) {
  const [messages, setMessages] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [historyError, setHistoryError] = useState('')
  const [deletingConversationId, setDeletingConversationId] = useState(null)
  const sending = useRef(false)
  const page = context?.page ?? 'fitness and nutrition'
  const persistConversations = context?.persistConversations === true

  useEffect(() => {
    if (!persistConversations) return undefined

    let active = true
    api.get('/ai-chat/conversations')
      .then(({ data }) => {
        if (active) setConversations(data.conversations ?? [])
      })
      .catch((err) => {
        if (active) setHistoryError(err.response?.data?.message || 'Could not load saved conversations.')
      })

    return () => { active = false }
  }, [persistConversations])

  const send = async (value) => {
    const message = value.trim()
    if (!message || sending.current) return

    sending.current = true
    const history = [...messages, { role: 'user', content: message }]
    setMessages(history)
    setBusy(true)
    setError('')

    const contextDetails = context?.data
      ? `\n\nCurrent ${page} page data (use only when relevant):\n${JSON.stringify(context.data)}`
      : ''

    try {
      const { data } = await api.post('/ai/chat', {
        system_prompt: `${BASE_PROMPT}\n\nThe user is chatting from the ${page} page. Tailor your answer to this page when relevant.${contextDetails}`,
        message,
        messages: history,
        ...(persistConversations && activeConversationId ? { conversation_id: activeConversationId } : {}),
      })
      if (typeof data?.message !== 'string' || !data.message.trim()) {
        throw new Error('The AI service returned an empty response. Please try again.')
      }
      setMessages((current) => [...current, { role: 'assistant', content: data.message }])
      if (persistConversations && data.conversation_id) {
        setActiveConversationId(data.conversation_id)
        setConversations((current) => {
          const existing = current.find((item) => String(item.conversation_id) === String(data.conversation_id))
          const conversation = {
            ...existing,
            conversation_id: data.conversation_id,
            title: data.title || existing?.title || message.slice(0, 255),
            updated_at: new Date().toISOString(),
          }
          return [conversation, ...current.filter((item) => String(item.conversation_id) !== String(data.conversation_id))]
        })
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not reach AIVO. Please try again.')
    } finally {
      sending.current = false
      setBusy(false)
    }
  }

  const newChat = () => {
    if (sending.current) return
    setMessages([])
    setActiveConversationId(null)
    setError('')
    setHistoryError('')
  }

  const selectConversation = async (conversationId) => {
    if (busy) return
    setHistoryError('')
    try {
      const { data } = await api.get(`/ai-chat/conversations/${conversationId}`)
      setActiveConversationId(data.conversation.conversation_id)
      setMessages((data.conversation.messages ?? []).map((item) => ({
        role: item.sender === 'assistant' ? 'assistant' : 'user',
        content: item.content,
      })))
      setError('')
    } catch (err) {
      setHistoryError(err.response?.data?.message || 'Could not open this conversation.')
    }
  }

  const deleteConversation = async (conversationId) => {
    if (busy || deletingConversationId) return
    setDeletingConversationId(conversationId)
    setHistoryError('')
    try {
      await api.delete(`/ai-chat/conversations/${conversationId}`)
      setConversations((current) => current.filter((item) => String(item.conversation_id) !== String(conversationId)))
      if (String(activeConversationId) === String(conversationId)) {
        setActiveConversationId(null)
        setMessages([])
        setError('')
      }
    } catch (err) {
      setHistoryError(err.response?.data?.message || 'Could not delete this conversation.')
    } finally {
      setDeletingConversationId(null)
    }
  }

  return {
    messages,
    busy,
    error,
    send,
    newChat,
    page,
    conversations,
    activeConversationId,
    historyError,
    deletingConversationId,
    selectConversation,
    deleteConversation,
  }
}
