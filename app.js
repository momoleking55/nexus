// ── Variables ──
let currentUser = null

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
        '</div>' +
      '</div>' +
      (post.author === currentUser.username
        ? '<button onclick="deletePost(\'' + post.id + '\')" class="btn-delete">🗑</button>'
        : '') +
      '<div class="post-text">' + post.text + '</div>' +
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
  document.getElementById('compose').style.display      = view === 'feed' ? 'block' : 'none'
  document.getElementById('posts-list').style.display   = view === 'feed' ? 'block' : 'none'
  document.getElementById('view-profile').style.display = view === 'profile' ? 'block' : 'none'
  document.getElementById('view-user').style.display    = view === 'user' ? 'block' : 'none'

  if (view === 'profile') renderProfile()
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
      '<div class="post-text">' + post.text + '</div>' +
      (post.image_url
        ? '<img src="' + post.image_url + '" style="width:100%;border-radius:12px;margin-bottom:12px">'
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

  const { data: posts } = await db
    .from('posts')
    .select('*')
    .eq('author', username)
    .order('created_at', { ascending: false })

  const totalLikes = posts.reduce(function(sum, p) { return sum + p.likes.length }, 0)
  document.getElementById('user-stat-posts').textContent = posts.length
  document.getElementById('user-stat-likes').textContent = totalLikes

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
      '<div class="post-text">' + post.text + '</div>' +
      (post.image_url
        ? '<img src="' + post.image_url + '" style="width:100%;border-radius:12px;margin-bottom:12px">'
        : '') +
      '<div class="post-actions">' +
        '<button>❤️ ' + post.likes.length + '</button>' +
        '<button>💬</button>' +
      '</div>'
    list.appendChild(div)
  })
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
}
