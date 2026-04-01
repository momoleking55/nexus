exports.handler = async function(event) {
  const { message, history } = JSON.parse(event.body)

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: 'Tu es un assistant sympa intégré dans Nexus, un réseau social. Réponds en français, de façon courte et conviviale.',
      messages: [
        ...history,
        { role: 'user', content: message }
      ]
    })
  })

  const data = await response.json()

  return {
    statusCode: 200,
    body: JSON.stringify({
      reply: data.content[0].text
    })
  }
}
