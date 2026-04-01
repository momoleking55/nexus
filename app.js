// ── Variables ──
let currentUser = null

// ── Formater la date ──
function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ── Connexion ──
async function login() {
  const username = document.getElementById('login-username').value.trim()
  const password = document.getElementById('login-password').value

  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('username', username)
    .single()

  if (error || !data) {
    showError('Cet utilisateur n\'existe pas.')
    return
  }

  if (data.password !== password) {
    showError('Mot de passe incorrect.')
    return
  }

  currentUser = data
  localStorage.setItem('nexus_user', JSON.stringify(data))
  showError('')
  document.getElementById('auth-screen').style.display = 'none'
  document.getElementById('app').style.display = 'block'
  renderPosts()
  updateMessageBadge()
}

// ── Inscription ──
async function register() {
  const name     = document.getElementById('reg-name').value.trim()
  const username = document.getElementById('reg-username').value.trim().toLowerCase()
  const password = document.getElementById('reg-password').value

  if (!name || !username || !password) {
    showError('Remplis tous les champs.')
    return
  }

  if (password.length < 6) {
    showError('Mot de passe trop court (6 caractères minimum).')
    return
  }

  const { error } = await db
    .from('users')
    .insert({ name, username, password })

  if (error) {
    showError('Ce pseudo est déjà pris.')
    return
  }

  showError('')
  alert('Compte créé ! Tu peux te connecter.')
}

// ── Déconnexion ──
function logout() {
  currentUser = null
  localStorage.removeItem('nexus_user')
  document.getElementById('app').style.display = 'none'
  document.getElementById('auth-screen').style.display = 'block'
}

// ── Switcher connexion / inscription ──
function switchTab(tab) {
  const loginForm    = document.getElementById('login-form')
  const registerForm = document.getElementById('register-form')

  if (tab === 'login') {
    loginForm.style.display    = 'block'
    registerForm.style.display = 'none'
  } else {
    loginForm.style.display    = 'none'
    registerForm.style.display = 'block'
  }
}

// ── Erreur ──
function showError(message) {
  document.getElementById('auth-error').textContent = message
}

// ── Créer un post ──
async function createPost() {
  const text = document.getElementById('post-text').value.trim()
  const file = document.getElementById('post-image').files[0]

  if (!text && !file) return

  let image_url = ''

  if (file) {
    const fileName = currentUser.username + '_' + Date.now()

    const { error: uploadError } = await db
      .storage
      .from('photos')
      .upload(fileName, file)

    if (uploadError) {
      console.error(uploadError)
      return
    }

    const { data } = db
      .storage
      .from('photos')
      .getPublicUrl(fileName)

    image_url = data.publicUrl
  }

  const { error } = await db
    .from('posts')
    .insert({
      author:      currentUser.username,
      author_name: currentUser.name,
      text:        text,
      image_url:   image_url,
      avatar_url:  currentUser.avatar_url || ''
    })

  if (error) {
    console.error(error)
    return
  }

  document.getElementById('post-text').value  = ''
  document.getElementById('post-image').value = ''
  document.getElementById('image-preview').innerHTML = ''

  // Détecter si @claude est mentionné
  if (text.toLowerCase().includes('@claude')) {
    claudeReply(newPost.id, text, currentUser.name)
  }

  renderPosts()
}

// ── Afficher les posts ──
async function renderPosts() {
  const list = document.getElementById('posts-list')

  list.innerHTML =
    '<div class="skeleton-card">' +
      '<div class="skeleton skeleton-avatar"></div>' +
      '<div class="skeleton skeleton-line" style="width:60%"></div>' +
      '<div class="skeleton skeleton-line" style="width:90%"></div>' +
      '<div class="skeleton skeleton-line" style="width:40%"></div>' +
    '</div>'.repeat(3)

  const { data: posts, error } = await db
    .from('posts')
    .select('*, comments(*)')
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return
  }

  if (posts.length === 0) {
    list.innerHTML = '<p style="padding:24px;color:var(--muted);text-align:center">✨ Aucun post pour le moment.</p>'
    return
  }

  list.innerHTML = ''

  posts.forEach(function(post) {
    const div     = document.createElement('div')
    div.className = 'post-card'
    div.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;cursor:pointer" onclick="showUserProfile(\'' + post.author + '\')">' +
        (post.avatar_url
          ? '<img src="' + post.avatar_url + '" style="width:38px;height:38px;border-radius:50%;object-fit:cover">'
          : '<div style="width:38px;height:38px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.9rem">' + post.author_name[0].toUpperCase() + '</div>') +
        '<div>' +
          '<strong>' + post.author_name + '</strong>' +
          '<span> @' + post.author + '</span>' +
          '<span style="color:var(--muted);font-size:0.8rem;margin-left:8px">' + formatDate(post.created_at) + '</span>' +
        '</div>' +
      '</div>' +
      (post.author === currentUser.username
        ? '<button onclick="deletePost(\'' + post.id + '\')" class="btn-delete">🗑</button>'
        : '') +
      '<div class="post-text">' + formatText(post.text) + '</div>' +
      (post.image_url
        ? '<img src="' + post.image_url + '" style="width:100%;border-radius:12px;margin-bottom:12px">'
        : '') +
      '<div class="post-actions">' +
        '<button onclick="toggleLike(\'' + post.id + '\')">' +
          (post.likes.includes(currentUser.username) ? '❤️' : '🤍') +
          ' ' + post.likes.length +
        '</button>' +
        '<button onclick="toggleComments(\'' + post.id + '\')">💬 ' + post.comments.length + '</button>' +
      '</div>' +
      '<div id="comments-' + post.id + '" style="display:none" class="comments-section">' +
        '<input type="text" id="comment-input-' + post.id + '" placeholder="Ton commentaire...">' +
        '<button onclick="addComment(\'' + post.id + '\')">→</button>' +
        '<div id="comment-list-' + post.id + '">' +
          post.comments.map(function(c) {
            return '<div class="comment-item"><strong>' + c.author_name + '</strong> ' + c.text + '</div>'
          }).join('') +
        '</div>' +
      '</div>'
    list.appendChild(div)
  })
  updateMessageBadge()
}

// ── Liker un post ──
async function toggleLike(id) {
  const { data: post } = await db
    .from('posts')
    .select('likes')
    .eq('id', id)
    .single()

  let likes = post.likes || []
  const index = likes.indexOf(currentUser.username)

  if (index === -1) {
    likes.push(currentUser.username)
  } else {
    likes.splice(index, 1)
  }

  await db.from('posts').update({ likes }).eq('id', id)

  const btn = document.querySelector('[onclick="toggleLike(\'' + id + '\')"]')
  if (btn) {
    btn.classList.add('liked')
    setTimeout(function() { btn.classList.remove('liked') }, 400)
  }

  renderPosts()
}

// ── Supprimer un post ──
async function deletePost(id) {
  if (!confirm('Supprimer ce post ?')) return
  await db.from('posts').delete().eq('id', id)
  renderPosts()
}

// ── Commentaires ──
function toggleComments(id) {
  const section = document.getElementById('comments-' + id)
  if (section.style.display === 'none') {
    section.style.display = 'block'
  } else {
    section.style.display = 'none'
  }
}

async function addComment(id) {
  const input = document.getElementById('comment-input-' + id)
  const text  = input.value.trim()
  if (!text) return

  await db.from('comments').insert({
    post_id:     id,
    author:      currentUser.username,
    author_name: currentUser.name,
    text:        text
  })

  input.value = ''
  renderPosts()
}

// ── Naviguer entre les vues ──
function showView(view) {
  document.getElementById('compose').style.display           = view === 'feed' ? 'block' : 'none'
  document.getElementById('posts-list').style.display        = view === 'feed' ? 'block' : 'none'
  document.getElementById('view-profile').style.display      = view === 'profile' ? 'block' : 'none'
  document.getElementById('view-user').style.display         = view === 'user' ? 'block' : 'none'
  document.getElementById('view-messages').style.display     = view === 'messages' ? 'block' : 'none'
  document.getElementById('view-conversation').style.display = view === 'conversation' ? 'block' : 'none'

  if (view === 'profile')     renderProfile()
  if (view === 'messages')    renderConversations()
}

// ── Afficher le profil personnel ──
async function renderProfile() {
  const { data: posts } = await db
    .from('posts')
    .select('*')
    .eq('author', currentUser.username)
    .order('created_at', { ascending: false })

  const totalLikes = posts.reduce(function(sum, p) { return sum + p.likes.length }, 0)

  document.getElementById('profile-name').textContent     = currentUser.name
  document.getElementById('profile-username').textContent = '@' + currentUser.username
  document.getElementById('profile-bio').textContent      = currentUser.bio || 'Aucune bio.'
  document.getElementById('stat-posts').textContent       = posts.length + ' posts'
  document.getElementById('stat-likes').textContent       = totalLikes + ' likes reçus'

  // Compter ses followers
const { count: followersCount } = await db
  .from('follows')
  .select('*', { count: 'exact' })
  .eq('following', currentUser.username)

const { count: followingCount } = await db
  .from('follows')
  .select('*', { count: 'exact' })
  .eq('follower', currentUser.username)

document.getElementById('stat-posts').textContent   = posts.length + ' posts'
document.getElementById('stat-likes').textContent   = totalLikes + ' likes reçus'

// Ajouter followers/following si pas déjà présents
let statsDiv = document.getElementById('profile-stats')
statsDiv.innerHTML =
  '<span><strong>' + posts.length + '</strong> <span style="color:var(--muted)">posts</span></span>' +
  '<span><strong>' + (followersCount || 0) + '</strong> <span style="color:var(--muted)">followers</span></span>' +
  '<span><strong>' + (followingCount || 0) + '</strong> <span style="color:var(--muted)">following</span></span>'

  const avatarImg = document.getElementById('profile-avatar-img')
  if (currentUser.avatar_url) {
    avatarImg.src = currentUser.avatar_url
    avatarImg.style.display = 'block'
  }

  const list = document.getElementById('profile-posts')
  list.innerHTML = ''

  posts.forEach(function(post) {
    const div     = document.createElement('div')
    div.className = 'post-card'
    div.innerHTML =
      '<div class="post-text">' + formatText(post.text) + '</div>' +
      '<span style="color:var(--muted);font-size:0.8rem">' + formatDate(post.created_at) + '</span>' +
      (post.image_url
        ? '<img src="' + post.image_url + '" style="width:100%;border-radius:12px;margin:8px 0">'
        : '') +
      '<div class="post-actions">' +
        '<button>❤️ ' + post.likes.length + '</button>' +
        '<button>💬</button>' +
      '</div>'
    list.appendChild(div)
  })
}

// ── Voir le profil d'un autre utilisateur ──
async function showUserProfile(username) {
  if (username === currentUser.username) {
    showView('profile')
    return
  }

  showView('user')

  const { data: user } = await db
    .from('users')
    .select('*')
    .eq('username', username)
    .single()

  if (!user) return

  const avatarImg     = document.getElementById('user-avatar-img')
  const avatarInitial = document.getElementById('user-avatar-initial')

  if (user.avatar_url) {
    avatarImg.src               = user.avatar_url
    avatarImg.style.display     = 'block'
    avatarInitial.style.display = 'none'
  } else {
    avatarInitial.textContent   = user.name[0].toUpperCase()
    avatarInitial.style.display = 'flex'
    avatarImg.style.display     = 'none'
  }

  document.getElementById('user-name').textContent     = user.name
  document.getElementById('user-username').textContent = '@' + user.username
  document.getElementById('user-bio').textContent      = user.bio || 'Aucune bio.'

  // Vérifier si on follow déjà
  const { data: followData } = await db
    .from('follows')
    .select('id')
    .eq('follower', currentUser.username)
    .eq('following', username)
    .single()

  const isFollowing = !!followData

  // Compter les followers
  const { count: followersCount } = await db
    .from('follows')
    .select('*', { count: 'exact' })
    .eq('following', username)

  const { data: posts } = await db
    .from('posts')
    .select('*')
    .eq('author', username)
    .order('created_at', { ascending: false })

  const totalLikes = posts.reduce(function(sum, p) { return sum + p.likes.length }, 0)

  document.getElementById('user-stat-posts').textContent = posts.length
  document.getElementById('user-stat-likes').textContent = totalLikes

  // Ajouter les stats followers + bouton follow
  const statsDiv = document.getElementById('user-stat-posts').parentElement
  statsDiv.innerHTML =
    '<span><strong>' + posts.length + '</strong> <span style="color:var(--muted)">posts</span></span>' +
    '<span><strong>' + totalLikes + '</strong> <span style="color:var(--muted)">likes</span></span>' +
    '<span><strong id="followers-count">' + (followersCount || 0) + '</strong> <span style="color:var(--muted)">followers</span></span>'

  // Bouton follow
  const followBtn = document.createElement('button')
  followBtn.id          = 'follow-btn'
  followBtn.textContent = isFollowing ? '✓ Suivi' : '+ Suivre'
  followBtn.style.cssText = 'width:auto;padding:8px 20px;border-radius:50px;margin-top:12px;font-size:0.9rem;' +
    (isFollowing
      ? 'background:transparent;border:1px solid var(--border);color:var(--muted)'
      : 'background:var(--accent);border:none;color:#fff')
  followBtn.onclick = function() { toggleFollow(username) }
  statsDiv.appendChild(followBtn)

  const list = document.getElementById('user-posts')
  list.innerHTML = ''

  if (posts.length === 0) {
    list.innerHTML = '<p style="padding:24px;color:var(--muted);text-align:center">Aucun post.</p>'
    return
  }

  posts.forEach(function(post) {
    const div     = document.createElement('div')
    div.className = 'post-card'
    div.innerHTML =
      '<div class="post-text">' + formatText(post.text) + '</div>' +
      '<span style="color:var(--muted);font-size:0.8rem">' + formatDate(post.created_at) + '</span>' +
      (post.image_url
        ? '<img src="' + post.image_url + '" style="width:100%;border-radius:12px;margin:8px 0">'
        : '') +
      '<div class="post-actions">' +
        '<button>❤️ ' + post.likes.length + '</button>' +
        '<button>💬</button>' +
      '</div>'
    list.appendChild(div)
  })

  const msgBtn = document.createElement('button')
msgBtn.textContent  = '💬 Message'
msgBtn.style.cssText = 'width:auto;padding:8px 20px;border-radius:50px;margin-top:8px;margin-left:8px;font-size:0.9rem;background:transparent;border:1px solid var(--border);color:var(--text)'
msgBtn.onclick = function() { openConversation(username, user.name) }
statsDiv.appendChild(msgBtn)
}

// ── Upload avatar ──
async function uploadAvatar(input) {
  const file = input.files[0]
  if (!file) return

  const fileName = 'avatar_' + currentUser.username

  await db.storage.from('photos').upload(fileName, file, { upsert: true })

  const { data } = db.storage.from('photos').getPublicUrl(fileName)

  await db.from('users').update({ avatar_url: data.publicUrl }).eq('username', currentUser.username)

  currentUser.avatar_url = data.publicUrl
  document.getElementById('profile-avatar-img').src = data.publicUrl
  document.getElementById('profile-avatar-img').style.display = 'block'
}

// ── Modifier le profil ──
function toggleEditProfile() {
  const info = document.getElementById('profile-info')
  const edit = document.getElementById('profile-edit')

  if (edit.style.display === 'none') {
    document.getElementById('edit-name').value = currentUser.name
    document.getElementById('edit-bio').value  = currentUser.bio || ''
    info.style.display = 'none'
    edit.style.display = 'block'
  } else {
    info.style.display = 'block'
    edit.style.display = 'none'
  }
}

// ── Sauvegarder le profil ──
async function saveProfile() {
  const name = document.getElementById('edit-name').value.trim()
  const bio  = document.getElementById('edit-bio').value.trim()
  if (!name) return

  await db
    .from('users')
    .update({ name, bio })
    .eq('username', currentUser.username)

  currentUser.name = name
  currentUser.bio  = bio

  toggleEditProfile()
  renderProfile()
}

// ── Prévisualisation image ──
document.addEventListener('DOMContentLoaded', function() {
  const input = document.getElementById('post-image')
  if (input) {
    input.addEventListener('change', function() {
      const file    = input.files[0]
      const preview = document.getElementById('image-preview')
      if (!file) return
      const url = URL.createObjectURL(file)
      preview.innerHTML = '<img src="' + url + '" style="max-width:100%;border-radius:12px;max-height:200px;object-fit:cover">'
    })
  }
})

// ── Chatbot ──
let chatHistory = []
let chatOpen = false

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

async function sendMessage() {
  const input = document.getElementById('chat-input')
  const text  = input.value.trim()
  if (!text) return

  input.value = ''
  addChatMessage('user', text)

  const loading = document.createElement('div')
  loading.style.cssText = 'color:var(--muted);font-size:0.85rem;align-self:flex-start;padding:8px 14px'
  loading.textContent = '...'
  loading.id = 'chat-loading'
  document.getElementById('chat-messages').appendChild(loading)

  chatHistory.push({ role: 'user', content: text })

  try {
    const response = await fetch('/.netlify/functions/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        history: chatHistory.slice(-6)
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

// ── Reconnexion automatique ──
const savedUser = localStorage.getItem('nexus_user')
if (savedUser) {
  currentUser = JSON.parse(savedUser)
  document.getElementById('auth-screen').style.display = 'none'
  document.getElementById('app').style.display = 'block'
  renderPosts()
  updateMessageBadge()
}

// ── Formater les mentions et hashtags ──
function formatText(text) {
  return text
    .replace(/\n/g, '<br>')
    .replace(/@(\w+)/g, '<span onclick="showUserProfile(\'$1\')" style="color:var(--accent);cursor:pointer;font-weight:600">@$1</span>')
    .replace(/#(\w+)/g, '<span onclick="searchHashtag(\'$1\')" style="color:var(--accent2);cursor:pointer;font-weight:600">#$1</span>')
}

// ── Recherche par hashtag ──
async function searchHashtag(tag) {
  showView('feed')

  const list = document.getElementById('posts-list')

  // Header avec retour — toujours visible
  list.innerHTML =
    '<div style="padding:16px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:12px;position:sticky;top:0;background:var(--bg);z-index:5">' +
      '<button onclick="renderPosts()" style="width:auto;padding:8px 16px;border-radius:50px;background:transparent;border:1px solid var(--border);color:var(--text);font-size:0.85rem;margin:0">← Retour</button>' +
      '<span style="color:var(--accent2);font-weight:600">#' + tag + '</span>' +
    '</div>' +
    '<div id="hashtag-results"></div>'

  const results = document.getElementById('hashtag-results')

  const { data: posts } = await db
    .from('posts')
    .select('*, comments(*)')
    .ilike('text', '%#' + tag + '%')
    .order('created_at', { ascending: false })

  if (!posts || posts.length === 0) {
    results.innerHTML = '<p style="padding:24px;color:var(--muted);text-align:center">Aucun post avec #' + tag + '</p>'
    return
  }

  posts.forEach(function(post) {
    const div     = document.createElement('div')
    div.className = 'post-card'
    div.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;cursor:pointer" onclick="showUserProfile(\'' + post.author + '\')">' +
        (post.avatar_url
          ? '<img src="' + post.avatar_url + '" style="width:38px;height:38px;border-radius:50%;object-fit:cover">'
          : '<div style="width:38px;height:38px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.9rem">' + post.author_name[0].toUpperCase() + '</div>') +
        '<div>' +
          '<strong>' + post.author_name + '</strong>' +
          '<span> @' + post.author + '</span>' +
          '<span style="color:var(--muted);font-size:0.8rem;margin-left:8px">' + formatDate(post.created_at) + '</span>' +
        '</div>' +
      '</div>' +
      '<div class="post-text">' + formatText(post.text) + '</div>' +
      (post.image_url
        ? '<img src="' + post.image_url + '" style="width:100%;border-radius:12px;margin-bottom:12px">'
        : '') +
      '<div class="post-actions">' +
        '<button onclick="toggleLike(\'' + post.id + '\')">' +
          (post.likes.includes(currentUser.username) ? '❤️' : '🤍') +
          ' ' + post.likes.length +
        '</button>' +
        '<button onclick="toggleComments(\'' + post.id + '\')">💬 ' + post.comments.length + '</button>' +
      '</div>'
    results.appendChild(div)
  })
}



// ── Follow / Unfollow ──
async function toggleFollow(username) {
  const btn = document.getElementById('follow-btn')

  const { data: existing } = await db
    .from('follows')
    .select('id')
    .eq('follower', currentUser.username)
    .eq('following', username)
    .single()

  if (existing) {
    // Unfollow
    await db.from('follows').delete().eq('id', existing.id)
    btn.textContent = '+ Suivre'
    btn.style.background = 'var(--accent)'
    btn.style.border = 'none'
    btn.style.color = '#fff'
  } else {
    // Follow
    await db.from('follows').insert({
      follower:  currentUser.username,
      following: username
    })
    btn.textContent = '✓ Suivi'
    btn.style.background = 'transparent'
    btn.style.border = '1px solid var(--border)'
    btn.style.color = 'var(--muted)'
  }

  // Mettre à jour le compteur
  const { count } = await db
    .from('follows')
    .select('*', { count: 'exact' })
    .eq('following', username)

  document.getElementById('followers-count').textContent = count || 0
}


// ── Améliorer un post avec Claude ──
async function improvePost() {
  const textarea = document.getElementById('post-text')
  const text     = textarea.value.trim()

  if (!text) {
    alert('Écris quelque chose d\'abord !')
    return
  }

  const btn = document.querySelector('[onclick="improvePost()"]')
  btn.textContent = '⏳ ...'
  btn.disabled    = true

  try {
    const response = await fetch('/.netlify/functions/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Améliore ce post pour un réseau social, rends-le plus engageant et accrocheur. Réponds UNIQUEMENT avec le post amélioré, sans explication : ' + text,
        history: [],
        context: ''
      })
    })

    const data = await response.json()
    textarea.value = data.reply

  } catch(err) {
    alert('Erreur lors de l\'amélioration 😕')
  }

  btn.textContent = '✨ Améliorer'
  btn.disabled    = false
}

// ── Messages privés ──
let currentConversation = null

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

  // Grouper par conversation
  const conversations = {}
  messages.forEach(function(msg) {
    const other = msg.sender === currentUser.username ? msg.recipient : msg.sender
    const otherName = msg.sender === currentUser.username ? msg.recipient : msg.sender_name
    if (!conversations[other]) {
      conversations[other] = {
        username: other,
        name: otherName,
        lastMessage: msg.text,
        lastDate: msg.created_at,
        unread: 0
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

async function openConversation(username, name) {
  currentConversation = username
  document.getElementById('conversation-username').textContent = name + ' (@' + username + ')'
  showView('conversation')

  // Marquer comme lu
  await db.from('messages')
    .update({ read: true })
    .eq('sender', username)
    .eq('recipient', currentUser.username)
updateMessageBadge()
  loadConversationMessages()
}

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
}

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

// ── Temps réel messages ──
db.channel('messages')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    function(payload) {
      const msg = payload.new

      // Si on est dans la conversation concernée → recharger les messages
      if (msg.recipient === currentUser.username || msg.sender === currentUser.username) {
        if (currentConversation === msg.sender || currentConversation === msg.recipient) {
          loadConversationMessages()
        }
      }

      // Mettre à jour le badge
      updateMessageBadge()
    }
  )
  .subscribe()

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

// ── Claude répond automatiquement ──
async function claudeReply(postId, postText, postAuthor) {
  try {
    const response = await fetch('/.netlify/functions/claude-bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId:     postId,
        postText:   postText,
        postAuthor: postAuthor
      })
    })

    const data = await response.json()

    // Poster le commentaire en tant que @claude
    await db.from('comments').insert({
      post_id:     postId,
      author:      'claude',
      author_name: 'Claude AI',
      text:        data.reply
    })

    renderPosts()

  } catch(err) {
    console.error('Erreur Claude bot:', err)
  }
}
