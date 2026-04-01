exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { prompt } = JSON.parse(event.body)

    // Soumettre la requête à fal.ai
    const submitResponse = await fetch('https://queue.fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': 'Key ' + process.env.FAL_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt,
        image_size: 'square',
        num_images: 1
      })
    })

    const submitData = await submitResponse.json()
    const requestId = submitData.request_id

    // Attendre que l'image soit générée
    let result = null
    let attempts = 0

    while (!result && attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000))

      const statusResponse = await fetch('https://queue.fal.run/fal-ai/flux/schnell/requests/' + requestId, {
        headers: { 'Authorization': 'Key ' + process.env.FAL_KEY }
      })

      const statusData = await statusResponse.json()

      if (statusData.status === 'COMPLETED') {
        result = statusData
      } else if (statusData.status === 'FAILED') {
        throw new Error('Génération échouée')
      }

      attempts++
    }

    if (!result) throw new Error('Timeout')

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageUrl: result.output.images[0].url
      })
    }

  } catch(err) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    }
  }
}
