exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  if (!event.body) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No body' }) }
  }

  const { message, history } = JSON.parse(event.body)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: 'Tu es un assistant sympa intégré dans Nexus, un réseau social. Réponds en français, de façon courte et conviviale.',
      messages: [
        ...history,
        { role: 'user', content: message }
      ]
    })
  })

  const data = await response.json()

  if (!data.content || !data.content[0]) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erreur API', details: data })
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reply: data.content[0].text })
  }
}
