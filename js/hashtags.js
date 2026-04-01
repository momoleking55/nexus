// ── Recherche par hashtag ──
async function searchHashtag(tag) {
  showView('feed')

  const list = document.getElementById('posts-list')

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
