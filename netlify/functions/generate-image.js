exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { prompt } = JSON.parse(event.body)

    // Soumettre la requête
    const submitResponse = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': 'Key ' + process.env.FAL_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt:     prompt,
        image_size: 'square_hd',
        num_images: 1
      })
    })

    const text = await submitResponse.text()
    console.log('FAL response:', text)

    const data = JSON.parse(text)

    if (!data.images || !data.images[0]) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Pas d\'image générée : ' + text })
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: data.images[0].url })
    }

  } catch(err) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message })
    }
  }
}
