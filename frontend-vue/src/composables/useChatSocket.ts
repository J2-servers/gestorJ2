import { onUnmounted, ref } from 'vue'
import { io, Socket } from 'socket.io-client'
import type { ChatMessage } from '@/types/domain'

export interface PresenceEvent {
  userId: string
  online: boolean
}

export interface TypingEvent {
  resellerId: string
  senderId: string
  isTyping: boolean
}

export interface NewMessageEvent {
  resellerId: string
  message: ChatMessage
}

export interface MessagesReadEvent {
  resellerId: string
  readByRole: 'admin' | 'reseller'
}

type MessageHandler = (ev: NewMessageEvent) => void
type TypingHandler  = (ev: TypingEvent) => void
type ReadHandler    = (ev: MessagesReadEvent) => void

export function useChatSocket() {
  const onlineIds   = ref<Set<string>>(new Set())
  const connected   = ref(false)
  let socket: Socket | null = null

  const msgHandlers:    Set<MessageHandler> = new Set()
  const typingHandlers: Set<TypingHandler>  = new Set()
  const readHandlers:   Set<ReadHandler>    = new Set()

  function connect(token: string, backendUrl: string) {
    if (socket?.connected) return

    const url = backendUrl.replace(/\/api$/, '')
    socket = io(`${url}/chat`, {
      auth: { token },
      transports: ['websocket'],
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    })

    socket.on('connect', () => { connected.value = true })
    socket.on('disconnect', () => { connected.value = false })

    socket.on('online-list', (ids: string[]) => {
      onlineIds.value = new Set(ids)
    })

    socket.on('presence', (ev: PresenceEvent) => {
      const next = new Set(onlineIds.value)
      if (ev.online) next.add(ev.userId)
      else next.delete(ev.userId)
      onlineIds.value = next
    })

    socket.on('new-message', (ev: NewMessageEvent) => {
      msgHandlers.forEach((h) => h(ev))
    })

    socket.on('typing', (ev: TypingEvent) => {
      typingHandlers.forEach((h) => h(ev))
    })

    socket.on('messages-read', (ev: MessagesReadEvent) => {
      readHandlers.forEach((h) => h(ev))
    })
  }

  function disconnect() {
    socket?.disconnect()
    socket = null
    connected.value = false
    onlineIds.value = new Set()
  }

  function emitTyping(resellerId: string, isTyping: boolean) {
    socket?.emit('typing', { resellerId, isTyping })
  }

  function isOnline(userId?: string | null): boolean {
    if (!userId) return false
    return onlineIds.value.has(userId)
  }

  function onNewMessage(handler: MessageHandler) {
    msgHandlers.add(handler)
    return () => msgHandlers.delete(handler)
  }

  function onTyping(handler: TypingHandler) {
    typingHandlers.add(handler)
    return () => typingHandlers.delete(handler)
  }

  function onRead(handler: ReadHandler) {
    readHandlers.add(handler)
    return () => readHandlers.delete(handler)
  }

  onUnmounted(disconnect)

  return {
    connected,
    onlineIds,
    connect,
    disconnect,
    emitTyping,
    isOnline,
    onNewMessage,
    onTyping,
    onRead,
  }
}
