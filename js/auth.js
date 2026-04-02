// ── Connexion ──
async function login() {
  const username = document.getElementById('login-username').value.trim()
  const password = document.getElementById('login-password').value

  const { data, error } = await db
    .from('users')
    .select('*')
    .eq('username', username)
    .single()

  if (error || !data) {
    showError('Cet utilisateur n\'existe pas.')
    return
  }

  if (data.password !== password) {
    showError('Mot de passe incorrect.')
    return
  }

  currentUser = data
  localStorage.setItem('nexus_user', JSON.stringify(data))
  showError('')
  document.getElementById('auth-screen').style.display = 'none'
  document.getElementById('app').style.display = 'block'
  renderPosts()
  updateMessageBadge()
  loadWeather()
}

// ── Inscription ──
async function register() {
  const name     = document.getElementById('reg-name').value.trim()
  const username = document.getElementById('reg-username').value.trim().toLowerCase()
  const password = document.getElementById('reg-password').value

  if (!name || !username || !password) {
    showError('Remplis tous les champs.')
    return
  }

  if (password.length < 6) {
    showError('Mot de passe trop court (6 caractères minimum).')
    return
  }

  const { error } = await db
    .from('users')
    .insert({ name, username, password })

  if (error) {
    showError('Ce pseudo est déjà pris.')
    return
  }

  showError('')
  alert('Compte créé ! Tu peux te connecter.')
}

// ── Déconnexion ──
function logout() {
  currentUser = null
  localStorage.removeItem('nexus_user')
  document.getElementById('app').style.display = 'none'
  document.getElementById('auth-screen').style.display = 'block'
}

// ── Switcher connexion / inscription ──
function switchTab(tab) {
  const loginForm    = document.getElementById('login-form')
  const registerForm = document.getElementById('register-form')

  if (tab === 'login') {
    loginForm.style.display    = 'block'
    registerForm.style.display = 'none'
  } else {
    loginForm.style.display    = 'none'
    registerForm.style.display = 'block'
  }
}

// ── Afficher une erreur ──
function showError(message) {
  document.getElementById('auth-error').textContent = message
}
