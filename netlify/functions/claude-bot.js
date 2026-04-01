exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { postId, postText, postAuthor } = JSON.parse(event.body)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: 'Tu es Claude, un membre sympa du réseau social Nexus. Tu as été mentionné dans un post. Réponds de façon naturelle, courte et conviviale en français, comme un vrai utilisateur du réseau. Maximum 2-3 phrases. Ne commence pas par "Bonjour" à chaque fois.',
        messages: [
          {
            role: 'user',
            content: postAuthor + ' a écrit : "' + postText + '". Réponds à ce post.'
          }
        ]
      })
    })

    const text = await response.text()
    const data = JSON.parse(text)

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: data.content[0].text })
    }

  } catch(err) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: 'Erreur: ' + err.message })
    }
  }
}
