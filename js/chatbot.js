
// ── Ouvrir / fermer le chatbot ──
function toggleChat() {
  chatOpen = !chatOpen
  const window_ = document.getElementById('chat-window')
  window_.style.display = chatOpen ? 'flex' : 'none'

  if (chatOpen && chatHistory.length === 0) {
    addChatMessage('assistant', 'Bonjour ! Je suis ton assistant Nexus 👋 Comment puis-je t\'aider ?')
  }

  if (chatOpen) {
    setTimeout(function() {
      document.getElementById('chat-input').focus()
    }, 100)
  }
}

// ── Ajouter un message dans le chat ──
function addChatMessage(role, text) {
  const messages = document.getElementById('chat-messages')
  const div      = document.createElement('div')

  div.style.cssText = role === 'user'
    ? 'background:var(--accent);color:#fff;padding:10px 14px;border-radius:14px 14px 4px 14px;font-size:0.88rem;align-self:flex-end;max-width:80%'
    : 'background:var(--surface2, #1a1a26);color:var(--text);padding:10px 14px;border-radius:14px 14px 14px 4px;font-size:0.88rem;align-self:flex-start;max-width:80%;border:1px solid var(--border)'

  div.textContent = text
  messages.appendChild(div)
  messages.scrollTop = messages.scrollHeight
}

// ── Envoyer un message au chatbot ──
async function sendMessage() {
  const input = document.getElementById('chat-input')
  const text  = input.value.trim()
  if (!text) return

  input.value = ''
  addChatMessage('user', text)

  const loading = document.createElement('div')
  loading.style.cssText = 'color:var(--muted);font-size:0.85rem;align-self:flex-start;padding:8px 14px'
  loading.textContent   = '...'
  loading.id            = 'chat-loading'
  document.getElementById('chat-messages').appendChild(loading)

  chatHistory.push({ role: 'user', content: text })

  const { data: posts } = await db
    .from('posts')
    .select('author_name, text, likes, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  const postsContext = posts
    ? posts.map(function(p) {
        return p.author_name + ' : ' + p.text + ' (' + p.likes.length + ' likes, ' + formatDate(p.created_at) + ')'
      }).join('\n')
    : 'Aucun post'

  try {
    const response = await fetch('/.netlify/functions/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: chatHistory.slice(-6),
        context: postsContext
      })
    })

    const data = await response.json()

    document.getElementById('chat-loading')?.remove()
    addChatMessage('assistant', data.reply)
    chatHistory.push({ role: 'assistant', content: data.reply })

  } catch (err) {
    document.getElementById('chat-loading')?.remove()
    addChatMessage('assistant', 'Désolé, une erreur s\'est produite 😕')
  }
}
