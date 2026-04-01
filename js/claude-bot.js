
// ── Claude répond aux mentions dans les posts ──
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

// ── Claude répond aux commentaires ──
async function claudeCommentReply(postId, commentText, authorName) {
  try {
    const { data: comments } = await db
      .from('comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    const context = comments
      ? comments.map(function(c) {
          return c.author_name + ' : ' + c.text
        }).join('\n')
      : ''

    const response = await fetch('/.netlify/functions/claude-bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId:     postId,
        postText:   'Contexte de la discussion :\n' + context + '\n\nDernier commentaire de ' + authorName + ' : ' + commentText,
        postAuthor: authorName
      })
    })

    const data = await response.json()

    await db.from('comments').insert({
      post_id:     postId,
      author:      'claude',
      author_name: 'Claude AI',
      text:        data.reply
    })

    renderPosts()

  } catch(err) {
    console.error('Erreur Claude commentaire:', err)
  }
}

// ── Claude répond en message privé ──
async function claudePrivateReply(userMessage) {
  try {
    const response = await fetch('/.netlify/functions/claude-bot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postId:     null,
        postText:   userMessage,
        postAuthor: currentUser.name
      })
    })

    const data = await response.json()

    await db.from('messages').insert({
      sender:      'claude',
      sender_name: 'Claude AI',
      recipient:   currentUser.username,
      text:        data.reply
    })

    loadConversationMessages()

  } catch(err) {
    console.error('Erreur Claude message privé:', err)
  }
}
