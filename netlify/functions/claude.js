exports.handler = async function(event, context) {
  try {
    const body = JSON.parse(event.body)
    const message = body.message
    const history = body.history || []

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: 'Tu es un assistant sympa sur Nexus. Réponds en français, de façon courte.',
        messages: [
          ...history,
          { role: 'user', content: message }
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
