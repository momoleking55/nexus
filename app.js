// ── Variables ──
let currentUser = null

// ── Utilisateurs ──
function getUsers() {
  return JSON.parse(localStorage.getItem('users') || '{}')
}

function saveUsers(users) {
  localStorage.setItem('users', JSON.stringify(users))
}

// ── Posts ──
function getPosts() {
  return JSON.parse(localStorage.getItem('posts') || '[]')
}

function savePosts(posts) {
  localStorage.setItem('posts', JSON.stringify(posts))
}

// ── Connexion ──
function login() {
  const username = document.getElementById('login-username').value.trim()
  const password = document.getElementById('login-password').value
  const users    = getUsers()

  if (!users[username]) {
    showError('Cet utilisateur n\'existe pas.')
    return
  }

  if (users[username].password !== password) {
    showError('Mot de passe incorrect.')
    return
  }

  currentUser = users[username]
  showError('')
  document.getElementById('auth-screen').style.display = 'none'
  document.getElementById('app').style.display = 'block'
  renderPosts()
}

// ── Déconnexion ──
function logout() {
  currentUser = null
  document.getElementById('app').style.display = 'none'
  document.getElementById('auth-screen').style.display = 'block'
}

// ── Inscription ──
function register() {
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

  const users = getUsers()

  if (users[username]) {
    showError('Ce pseudo est déjà pris.')
    return
  }

  users[username] = { name, username, password }
  saveUsers(users)
  showError('')
  alert('Compte créé ! Tu peux te connecter.')
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
function createPost() {
  const text = document.getElementById('post-text').value.trim()
  if (!text) return

  const posts = getPosts()

  posts.unshift({
    id: Date.now().toString(),
    author: currentUser.username,
    authorName: currentUser.name,
    text: text,
    likes: [],
    comments: [],
    createdAt: Date.now()
  })

  savePosts(posts)
  document.getElementById('post-text').value = ''
  renderPosts()
}

// ── Afficher les posts ──
function renderPosts() {
  const list  = document.getElementById('posts-list')
  const posts = getPosts()

  if (posts.length === 0) {
    list.innerHTML = '<p style="padding:24px;color:var(--muted);text-align:center">Aucun post pour le moment.</p>'
    return
  }

  list.innerHTML = ''

  posts.forEach(function(post) {
    const div     = document.createElement('div')
    div.className = 'post-card'
div.innerHTML =
  '<strong>' + post.authorName + '</strong>' +
  '<span> @' + post.author + '</span>' +
  (post.author === currentUser.username
    ? '<button onclick="deletePost(\'' + post.id + '\')" class="btn-delete">🗑 Supprimer</button>'
    : '') +
  '<div class="post-text">' + post.text + '</div>' +
  '<div class="post-actions">' +
    '<button onclick="toggleLike(\'' + post.id + '\')">❤️ ' + post.likes.length + '</button>' +
    '<button onclick="toggleComments(\'' + post.id + '\')">💬 ' + post.comments.length + '</button>' +
  '</div>' +
  '<div id="comments-' + post.id + '" style="display:none" class="comments-section">' +
    '<input type="text" id="comment-input-' + post.id + '" placeholder="Ton commentaire...">' +
    '<button onclick="addComment(\'' + post.id + '\')">→</button>' +
    '<div id="comment-list-' + post.id + '">' +
      post.comments.map(function(c) {
        return '<div class="comment-item"><strong>' + c.authorName + '</strong> ' + c.text + '</div>'
      }).join('') +
    '</div>' +
  '</div>'
    list.appendChild(div)
  })
}

// ── Liker un post ──
function toggleLike(id) {
  const posts = getPosts()
  const post  = posts.find(function(p) { return p.id === id })
  const index = post.likes.indexOf(currentUser.username)

  if (index === -1) {
    post.likes.push(currentUser.username)
  } else {
    post.likes.splice(index, 1)
  }

  savePosts(posts)
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

function addComment(id) {
  const input = document.getElementById('comment-input-' + id)
  const text  = input.value.trim()
  if (!text) return

  const posts = getPosts()
  const post  = posts.find(function(p) { return p.id === id })

  post.comments.push({
    author:     currentUser.username,
    authorName: currentUser.name,
    text:       text
  })

  savePosts(posts)
  renderPosts()
}

// ── Supprimer un post ──
function deletePost(id) {
  if (!confirm('Supprimer ce post ?')) return

  const posts = getPosts().filter(function(p) {
    return p.id !== id
  })

  savePosts(posts)
  renderPosts()
}

// ── Naviguer entre les vues ──
function showView(view) {
  document.getElementById('compose').style.display      = view === 'feed' ? 'block' : 'none'
  document.getElementById('posts-list').style.display   = view === 'feed' ? 'block' : 'none'
  document.getElementById('view-profile').style.display = view === 'profile' ? 'block' : 'none'

  if (view === 'profile') renderProfile()
}

// ── Afficher le profil ──
function renderProfile() {
  const posts      = getPosts().filter(function(p) { return p.author === currentUser.username })
  const totalLikes = posts.reduce(function(sum, p) { return sum + p.likes.length }, 0)

  document.getElementById('profile-name').textContent     = currentUser.name
  document.getElementById('profile-username').textContent = '@' + currentUser.username
  document.getElementById('profile-bio').textContent      = currentUser.bio || 'Aucune bio.'
  document.getElementById('stat-posts').textContent       = posts.length + ' posts'
  document.getElementById('stat-likes').textContent       = totalLikes + ' likes reçus'

  const list = document.getElementById('profile-posts')
  list.innerHTML = ''
  posts.forEach(function(post) {
    const div     = document.createElement('div')
    div.className = 'post-card'
    div.innerHTML =
      '<div class="post-text">' + post.text + '</div>' +
      '<div class="post-actions">' +
        '<button>❤️ ' + post.likes.length + '</button>' +
        '<button>💬 ' + post.comments.length + '</button>' +
      '</div>'
    list.appendChild(div)
  })
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
function saveProfile() {
  const name = document.getElementById('edit-name').value.trim()
  const bio  = document.getElementById('edit-bio').value.trim()

  if (!name) return

  const users = getUsers()
  users[currentUser.username].name = name
  users[currentUser.username].bio  = bio
  saveUsers(users)

  currentUser.name = name
  currentUser.bio  = bio

  toggleEditProfile()
  renderProfile()
}
