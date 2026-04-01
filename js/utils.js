// ── Formater la date ──
function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// ── Formater les mentions et hashtags ──
function formatText(text) {
  return text
    .replace(/\n/g, '<br>')
    .replace(/@(\w+)/g, '<span onclick="showUserProfile(\'$1\')" style="color:var(--accent);cursor:pointer;font-weight:600">@$1</span>')
    .replace(/#(\w+)/g, '<span onclick="searchHashtag(\'$1\')" style="color:var(--accent2);cursor:pointer;font-weight:600">#$1</span>')
}
