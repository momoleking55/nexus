exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  try {
    const { lat, lon } = JSON.parse(event.body)

    const response = await fetch(
      'https://api.openweathermap.org/data/2.5/weather?lat=' + lat + '&lon=' + lon + '&appid=' + process.env.WEATHER_KEY + '&units=metric&lang=fr'
    )

    const data = await response.json()

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        city:        data.name,
        temp:        Math.round(data.main.temp),
        description: data.weather[0].description,
        icon:        data.weather[0].icon
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
