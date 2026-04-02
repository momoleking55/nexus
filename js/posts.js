// ── Créer un post ──
async function createPost() {
  const text = document.getElementById('post-text').value.trim()
  const file = document.getElementById('post-image').files[0]

  if (!text && !file && !generatedImageUrl) return

  let image_url    = ''
  let image_prompt = ''

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

  if (!image_url && generatedImageUrl) {
    image_url    = generatedImageUrl
    image_prompt = document.getElementById('image-prompt').value.trim()
  }

  const { error } = await db
    .from('posts')
    .insert({
      author:       currentUser.username,
      author_name:  currentUser.name,
      text:         text,
      image_url:    image_url,
      image_prompt: image_prompt,
      avatar_url:   currentUser.avatar_url || ''
    })

  if (error) {
    console.error(error)
    return
  }

  const { data: newPost } = await db
    .from('posts')
    .select('*')
    .eq('author', currentUser.username)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  document.getElementById('post-text').value           = ''
  document.getElementById('post-image').value          = ''
  document.getElementById('image-preview').innerHTML   = ''
  document.getElementById('generated-preview').innerHTML = ''
  document.getElementById('image-prompt').value        = ''
  generatedImageUrl = null

  if (text.toLowerCase().includes('@claude')) {
    await claudeReply(newPost.id, text, currentUser.name)
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
  ? '<button onclick="deletePost(\'' + post.id + '\')" class="btn-delete">🗑</button>' +
    '<button onclick="editPost(\'' + post.id + '\')" class="btn-delete" style="margin-right:4px">✏️</button>'
  : '') +
      '<div class="post-text">' + formatText(post.text) + '</div>' +
      (post.image_url
        ? '<img src="' + post.image_url + '" style="width:100%;border-radius:12px;margin-bottom:6px">' +
          (post.image_prompt
            ? '<p style="color:var(--muted);font-size:0.8rem;margin-bottom:12px;font-style:italic">🎨 ' + post.image_prompt + '</p>'
            : '')
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

// ── Naviguer entre les vues ──
function showView(view) {
  document.getElementById('compose').style.display           = view === 'feed' ? 'block' : 'none'
  document.getElementById('posts-list').style.display        = view === 'feed' ? 'block' : 'none'
  document.getElementById('view-profile').style.display      = view === 'profile' ? 'block' : 'none'
  document.getElementById('view-user').style.display         = view === 'user' ? 'block' : 'none'
  document.getElementById('view-messages').style.display     = view === 'messages' ? 'block' : 'none'
  document.getElementById('view-conversation').style.display = view === 'conversation' ? 'block' : 'none'

  if (view === 'profile')  renderProfile()
  if (view === 'messages') renderConversations()

     // Mettre à jour la nav mobile
  const navBtns = ['mob-feed', 'mob-messages', 'mob-profile']
  navBtns.forEach(function(id) {
    const btn = document.getElementById(id)
    if (btn) btn.classList.remove('active')
  })
  const map = { feed: 'mob-feed', messages: 'mob-messages', profile: 'mob-profile' }
  if (map[view]) {
    const activeBtn = document.getElementById(map[view])
    if (activeBtn) activeBtn.classList.add('active')
  } 
}

// ── Modifier un post ──
async function editPost(id) {
  const { data: post } = await db
    .from('posts')
    .select('*')
    .eq('id', id)
    .single()

  if (!post) return

  const newText = prompt('Modifier ton post :', post.text)

  if (newText === null) return  // annulé
  if (!newText.trim()) return   // vide

  await db
    .from('posts')
    .update({ text: newText.trim() })
    .eq('id', id)

  renderPosts()
}
