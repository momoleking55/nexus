// ── Variables globales ──
let currentUser       = null
let generatedImageUrl = null
let chatHistory       = []
let chatOpen          = false
let currentConversation = null

// ── Reconnexion automatique ──
const savedUser = localStorage.getItem('nexus_user')
if (savedUser) {
  currentUser = JSON.parse(savedUser)
  document.getElementById('auth-screen').style.display = 'none'
  document.getElementById('app').style.display         = 'block'
  renderPosts()
  updateMessageBadge()
}

// ── Temps réel ──
db.channel('posts')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'posts' },
    function() { renderPosts() }
  )
  .subscribe()

db.channel('comments')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'comments' },
    function() { renderPosts() }
  )
  .subscribe()

db.channel('messages')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    function(payload) {
      const msg = payload.new
      if (msg.recipient === currentUser.username || msg.sender === currentUser.username) {
        if (currentConversation === msg.sender || currentConversation === msg.recipient) {
          loadConversationMessages()
        }
      }
      updateMessageBadge()
    }
  )
  .subscribe()
