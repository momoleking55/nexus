// ── Météo ──
async function loadWeather() {
  if (!navigator.geolocation) return

  navigator.geolocation.getCurrentPosition(async function(pos) {
    try {
      const response = await fetch('/.netlify/functions/weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude
        })
      })

      const data = await response.json()
      if (data.error) return

      const widget = document.getElementById('weather-widget')
      widget.innerHTML =
        '<img src="https://openweathermap.org/img/wn/' + data.icon + '.png" style="width:28px;height:28px">' +
        '<span><strong style="color:var(--text)">' + data.temp + '°C</strong> · ' + data.city + '</span>'

    } catch(err) {
      console.error('Météo:', err)
    }
  })
}
