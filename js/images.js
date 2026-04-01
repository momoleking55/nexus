// ── Générer une image avec IA ──
async function generateImage() {
  const prompt = document.getElementById('image-prompt').value.trim()
  if (!prompt) {
    alert('Décris d\'abord l\'image que tu veux générer !')
    return
  }

  const btn     = document.getElementById('gen-btn')
  const preview = document.getElementById('generated-preview')

  btn.textContent   = '⏳ Génération...'
  btn.disabled      = true
  preview.innerHTML = '<p style="color:var(--muted);font-size:0.85rem">Génération en cours... (~10 secondes)</p>'

  try {
    const response = await fetch('/.netlify/functions/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    })

    const data = await response.json()

    if (data.error) {
      preview.innerHTML = '<p style="color:var(--accent2);font-size:0.85rem">Erreur : ' + data.error + '</p>'
      return
    }

    generatedImageUrl = data.imageUrl
    preview.innerHTML =
      '<img src="' + data.imageUrl + '" style="max-width:100%;border-radius:12px;max-height:300px;object-fit:cover">' +
      '<p style="color:var(--muted);font-size:0.8rem;margin-top:6px">✅ Image ajoutée au post</p>'

  } catch(err) {
    preview.innerHTML = '<p style="color:var(--accent2);font-size:0.85rem">Erreur de génération 😕</p>'
  }

  btn.textContent = '🎨 Générer'
  btn.disabled    = false
}

// ── Prévisualisation image uploadée ──
document.addEventListener('DOMContentLoaded', function() {
  const input = document.getElementById('post-image')
  if (input) {
    input.addEventListener('change', function() {
      const file    = input.files[0]
      const preview = document.getElementById('image-preview')
      if (!file) return
      const url = URL.createObjectURL(file)
      preview.innerHTML = '<img src="' + url + '" style="max-width:100%;border-radius:12px;max-height:200px;object-fit:cover">'
    })
  }
})
