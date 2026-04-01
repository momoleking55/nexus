// ── Afficher les conversations ──
async function renderConversations() {
  const list = document.getElementById('conversations-list')
  list.innerHTML = '<p style="padding:24px;color:var(--muted);text-align:center">Chargement...</p>'

  const { data: messages } = await db
    .from('messages')
    .select('*')
    .or('sender.eq.' + currentUser.username + ',recipient.eq.' + currentUser.username)
    .order('created_at', { ascending: false })

  if (!messages || messages.length === 0) {
    list.innerHTML = '<p style="padding:24px;color:var(--muted);text-align:center">Aucune conversation.</p>'
    return
  }

  const conversations = {}
  messages.forEach(function(msg) {
    const other     = msg.sender === currentUser.username ? msg.recipient : msg.sender
    const otherName = msg.sender === currentUser.username ? msg.recipient : msg.sender_name
    if (!conversations[other]) {
      conversations[other] = {
        username:    other,
        name:        otherName,
        lastMessage: msg.text,
        lastDate:    msg.created_at,
        unread:      0
      }
    }
    if (msg.recipient === currentUser.username && !msg.read) {
      conversations[other].unread++
    }
  })

  list.innerHTML = ''
  Object.values(conversations).forEach(function(conv) {
    const div     = document.createElement('div')
    div.className = 'post-card'
    div.style.cursor = 'pointer'
    div.onclick = function() { openConversation(conv.username, conv.name) }
    div.innerHTML =
      '<div style="display:flex;align-items:center;gap:12px">' +
        '<div style="width:44px;height:44px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;flex-shrink:0">' + conv.name[0].toUpperCase() + '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="display:flex;justify-content:space-between;align-items:center">' +
            '<strong>' + conv.name + '</strong>' +
            '<span style="color:var(--muted);font-size:0.8rem">' + formatDate(conv.lastDate) + '</span>' +
          '</div>' +
          '<p style="color:var(--muted);font-size:0.85rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + conv.lastMessage + '</p>' +
        '</div>' +
        (conv.unread > 0
          ? '<div style="width:20px;height:20px;border-radius:50%;background:var(--accent);color:#fff;font-size:0.75rem;display:flex;align-items:center;justify-content:center">' + conv.unread + '</div>'
          : '') +
      '</div>'
    list.appendChild(div)
  })
}

// ── Ouvrir une conversation ──
async function openConversation(username, name) {
  currentConversation = username
  document.getElementById('conversation-username').textContent = name + ' (@' + username + ')'
  showView('conversation')

  await db.from('messages')
    .update({ read: true })
    .eq('sender', username)
    .eq('recipient', currentUser.username)

  updateMessageBadge()
  loadConversationMessages()
}

// ── Charger les messages ──
async function loadConversationMessages() {
  const list = document.getElementById('conversation-messages')
  list.innerHTML = ''

  const { data: messages } = await db
    .from('messages')
    .select('*')
    .or(
      'and(sender.eq.' + currentUser.username + ',recipient.eq.' + currentConversation + '),' +
      'and(sender.eq.' + currentConversation + ',recipient.eq.' + currentUser.username + ')'
    )
    .order('created_at', { ascending: true })

  if (!messages || messages.length === 0) {
    list.innerHTML = '<p style="color:var(--muted);text-align:center;font-size:0.9rem">Début de la conversation</p>'
    return
  }

  messages.forEach(function(msg) {
    const isMe = msg.sender === currentUser.username
    const div  = document.createElement('div')
    div.style.cssText = isMe
      ? 'background:var(--accent);color:#fff;padding:10px 14px;border-radius:14px 14px 4px 14px;font-size:0.9rem;align-self:flex-end;max-width:75%'
      : 'background:var(--surface);border:1px solid var(--border);color:var(--text);padding:10px 14px;border-radius:14px 14px 14px 4px;font-size:0.9rem;align-self:flex-start;max-width:75%'
    div.innerHTML =
      '<div>' + msg.text + '</div>' +
      '<div style="font-size:0.75rem;opacity:0.7;margin-top:4px;text-align:' + (isMe ? 'right' : 'left') + '">' + formatDate(msg.created_at) + '</div>'
    list.appendChild(div)
  })

  list.scrollTop = list.scrollHeight
}

// ── Envoyer un message ──
async function sendPrivateMessage() {
  const input = document.getElementById('message-input')
  const text  = input.value.trim()
  if (!text || !currentConversation) return

  input.value = ''

  await db.from('messages').insert({
    sender:      currentUser.username,
    sender_name: currentUser.name,
    recipient:   currentConversation,
    text:        text
  })

  loadConversationMessages()

  if (currentConversation === 'claude') {
    claudePrivateReply(text)
  }
}

// ── Rechercher un utilisateur ──
async function searchUserForMessage() {
  const query   = document.getElementById('search-user').value.trim().toLowerCase()
  const results = document.getElementById('search-user-results')

  if (!query) {
    results.innerHTML = ''
    return
  }

  const { data: users } = await db
    .from('users')
    .select('username, name')
    .ilike('username', '%' + query + '%')
    .neq('username', currentUser.username)
    .limit(5)

  if (!users || users.length === 0) {
    results.innerHTML = '<p style="color:var(--muted);font-size:0.85rem;padding:8px 0">Aucun utilisateur trouvé</p>'
    return
  }

  results.innerHTML = ''
  users.forEach(function(user) {
    const div = document.createElement('div')
    div.style.cssText = 'padding:10px;cursor:pointer;border-radius:10px;display:flex;align-items:center;gap:10px'
    div.onmouseover = function() { div.style.background = 'var(--surface2, #1a1a26)' }
    div.onmouseout  = function() { div.style.background = 'transparent' }
    div.onclick     = function() {
      document.getElementById('search-user').value = ''
      results.innerHTML = ''
      openConversation(user.username, user.name)
    }
    div.innerHTML =
      '<div style="width:36px;height:36px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700">' + user.name[0].toUpperCase() + '</div>' +
      '<div><strong>' + user.name + '</strong> <span style="color:var(--muted)">@' + user.username + '</span></div>'
    results.appendChild(div)
  })
}

// ── Badge messages non lus ──
async function updateMessageBadge() {
  const { count } = await db
    .from('messages')
    .select('*', { count: 'exact' })
    .eq('recipient', currentUser.username)
    .eq('read', false)

  const btn = document.querySelector('[onclick="showView(\'messages\')"]')
  if (!btn) return

  if (count > 0) {
    btn.innerHTML = '💬 <span style="background:var(--accent2);color:#fff;border-radius:50%;padding:1px 6px;font-size:0.75rem;font-weight:700">' + count + '</span>'
  } else {
    btn.innerHTML = '💬'
  }
}
