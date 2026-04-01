// ── Afficher le profil personnel ──
async function renderProfile() {
  const { data: posts } = await db
    .from('posts')
    .select('*')
    .eq('author', currentUser.username)
    .order('created_at', { ascending: false })

  const totalLikes = posts.reduce(function(sum, p) { return sum + p.likes.length }, 0)

  const { count: followersCount } = await db
    .from('follows')
    .select('*', { count: 'exact' })
    .eq('following', currentUser.username)

  const { count: followingCount } = await db
    .from('follows')
    .select('*', { count: 'exact' })
    .eq('follower', currentUser.username)

  document.getElementById('profile-name').textContent     = currentUser.name
  document.getElementById('profile-username').textContent = '@' + currentUser.username
  document.getElementById('profile-bio').textContent      = currentUser.bio || 'Aucune bio.'

  const statsDiv = document.getElementById('profile-stats')
  statsDiv.innerHTML =
    '<span><strong>' + posts.length + '</strong> <span style="color:var(--muted)">posts</span></span>' +
    '<span><strong>' + (followersCount || 0) + '</strong> <span style="color:var(--muted)">followers</span></span>' +
    '<span><strong>' + (followingCount || 0) + '</strong> <span style="color:var(--muted)">following</span></span>' +
    '<span><strong>' + totalLikes + '</strong> <span style="color:var(--muted)">likes reçus</span></span>'

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

  const { data: followData } = await db
    .from('follows')
    .select('id')
    .eq('follower', currentUser.username)
    .eq('following', username)
    .single()

  const isFollowing = !!followData

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

  const statsDiv = document.getElementById('user-stat-posts').parentElement
  statsDiv.innerHTML =
    '<span><strong>' + posts.length + '</strong> <span style="color:var(--muted)">posts</span></span>' +
    '<span><strong>' + totalLikes + '</strong> <span style="color:var(--muted)">likes</span></span>' +
    '<span><strong id="followers-count">' + (followersCount || 0) + '</strong> <span style="color:var(--muted)">followers</span></span>'

  const followBtn = document.createElement('button')
  followBtn.id = 'follow-btn'
  followBtn.textContent = isFollowing ? '✓ Suivi' : '+ Suivre'
  followBtn.style.cssText = 'width:auto;padding:8px 20px;border-radius:50px;margin-top:12px;font-size:0.9rem;' +
    (isFollowing
      ? 'background:transparent;border:1px solid var(--border);color:var(--muted)'
      : 'background:var(--accent);border:none;color:#fff')
  followBtn.onclick = function() { toggleFollow(username) }
  statsDiv.appendChild(followBtn)

  const msgBtn = document.createElement('button')
  msgBtn.textContent   = '💬 Message'
  msgBtn.style.cssText = 'width:auto;padding:8px 20px;border-radius:50px;margin-top:8px;margin-left:8px;font-size:0.9rem;background:transparent;border:1px solid var(--border);color:var(--text)'
  msgBtn.onclick = function() { openConversation(username, user.name) }
  statsDiv.appendChild(msgBtn)

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
