// ── Afficher / cacher les commentaires ──
function toggleComments(id) {
  const section = document.getElementById('comments-' + id)
  if (section.style.display === 'none') {
    section.style.display = 'block'
  } else {
    section.style.display = 'none'
  }
}

// ── Ajouter un commentaire ──
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

  // Claude répond si mentionné
  if (text.toLowerCase().includes('@claude')) {
    await claudeCommentReply(id, text, currentUser.name)
  }

  renderPosts()
}
