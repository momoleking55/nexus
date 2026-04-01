
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Nexus</title>
  <link rel="stylesheet" href="style.css">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="supabase.js"></script>
</head>

<!-- Bouton flottant chatbot -->
<button id="chat-toggle" onclick="toggleChat()" style="
  position:fixed;
  bottom:24px;
  right:24px;
  width:52px;
  height:52px;
  border-radius:50%;
  background:linear-gradient(135deg,var(--accent),var(--accent2));
  border:none;
  font-size:1.4rem;
  cursor:pointer;
  box-shadow:0 4px 20px #7c5cfc44;
  z-index:1000;
  margin:0;
  padding:0;
">🤖</button>

<!-- Fenêtre de chat -->
<div id="chat-window" style="
  display:none;
  position:fixed;
  bottom:90px;
  right:24px;
  width:320px;
  height:420px;
  background:var(--surface);
  border:1px solid var(--border);
  border-radius:20px;
  box-shadow:0 20px 60px #0008;
  z-index:1000;
  display:none;
  flex-direction:column;
  overflow:hidden;
">
  <div style="padding:16px 20px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
    <div>
      <strong style="font-size:0.95rem">🤖 Assistant Nexus</strong>
      <p style="color:var(--muted);font-size:0.8rem;margin:0">Propulsé par Claude</p>
    </div>
    <button onclick="toggleChat()" style="width:auto;background:transparent;border:none;color:var(--muted);font-size:1.2rem;padding:4px;margin:0">✕</button>
  </div>
  <div id="chat-messages" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px"></div>
  <div style="padding:12px;border-top:1px solid var(--border);display:flex;gap:8px">
    <input type="text" id="chat-input" placeholder="Pose une question..." style="flex:1;margin:0;padding:10px 14px;font-size:0.88rem" onkeydown="if(event.key==='Enter') sendMessage()">
    <button onclick="sendMessage()" style="width:auto;padding:10px 16px;border-radius:10px;margin:0;font-size:0.85rem">→</button>
  </div>
</div>



<body>

  <!-- ÉCRAN 1 : Auth -->
  <div id="auth-screen">
    <div class="auth-box">
      <h1>Nexus</h1>
      <p class="auth-subtitle">Ton espace, ta voix. Voila la liberté d'expression !!!</p>

      <div id="login-form">
        <input type="text"     id="login-username" placeholder="Ton pseudo">
        <input type="password" id="login-password" placeholder="Mot de passe">
        <button onclick="login()">Se connecter</button>
      </div>

      <div id="register-form" style="display:none">
        <input type="text"     id="reg-name"     placeholder="Ton prénom">
        <input type="text"     id="reg-username" placeholder="Choisis un pseudo">
        <input type="password" id="reg-password" placeholder="Choisis un mot de passe">
        <button onclick="register()">Créer mon compte</button>
      </div>

      <p id="auth-error"></p>

      <div class="tabs">
        <button class="tab-btn active" onclick="switchTab('login')">Connexion</button>
        <button class="tab-btn"        onclick="switchTab('register')">Inscription</button>
      </div>

    </div>
  </div>

  <!-- ÉCRAN 2 : App -->
  <div id="app" style="display:none">

    <div id="app-header">
      <h1>Nexus</h1>
      <div style="display:flex;gap:8px">
        <button onclick="showView('feed')">🏠</button>
        <button onclick="showView('profile')">👤</button>
        <button onclick="logout()">Déconnexion</button>
      </div>
    </div>

    <!-- Fil de posts -->
    <div id="compose">
      <textarea id="post-text" placeholder="Quoi de neuf ?"></textarea>
      <div style="margin-bottom:10px">
        <label for="post-image" style="cursor:pointer;color:var(--accent);font-size:0.9rem">
          📷 Ajouter une photo
        </label>
        <input type="file" id="post-image" accept="image/*" style="display:none">
        <div id="image-preview" style="margin-top:8px"></div>
      </div>
      <button onclick="createPost()">Publier</button>
    </div>

    <div id="posts-list"></div>

    <!-- Vue profil personnel -->
    <div id="view-profile" style="display:none">
      <div id="profile-cover"></div>
      <div id="profile-info">
        <div style="margin-bottom:16px">
          <img id="profile-avatar-img" src="" style="display:none;width:72px;height:72px;border-radius:50%;object-fit:cover">
          <label for="avatar-input" style="cursor:pointer;color:var(--accent);font-size:0.85rem;display:block;margin-top:8px">
            📷 Changer la photo
          </label>
          <input type="file" id="avatar-input" accept="image/*" style="display:none" onchange="uploadAvatar(this)">
        </div>
        <h2 id="profile-name"></h2>
        <p id="profile-username"></p>
        <p id="profile-bio"></p>
        <div id="profile-stats">
          <span id="stat-posts">0 posts</span>
          <span id="stat-likes">0 likes reçus</span>
        </div>
        <button onclick="toggleEditProfile()">Modifier le profil</button>
      </div>
      <div id="profile-edit" style="display:none">
        <input type="text" id="edit-name" placeholder="Ton nom">
        <textarea id="edit-bio" placeholder="Ta bio..."></textarea>
        <button onclick="saveProfile()">Enregistrer</button>
        <button onclick="toggleEditProfile()">Annuler</button>
      </div>
      <div id="profile-posts"></div>
    </div>

    <!-- Vue profil d'un autre utilisateur -->
    <div id="view-user" style="display:none">
      <div style="height:100px;background:linear-gradient(135deg,var(--accent),var(--accent2));opacity:0.6"></div>
      <div style="padding:20px 24px;border-bottom:1px solid var(--border)">
        <img id="user-avatar-img" src="" style="display:none;width:72px;height:72px;border-radius:50%;object-fit:cover;margin-bottom:12px">
        <div id="user-avatar-initial" style="width:72px;height:72px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.6rem;margin-bottom:12px"></div>
        <h2 id="user-name" style="font-size:1.3rem;font-weight:800"></h2>
        <p id="user-username" style="color:var(--muted);font-size:0.9rem;margin:4px 0"></p>
        <p id="user-bio" style="color:var(--muted);font-size:0.9rem;margin-bottom:16px"></p>
        <div style="display:flex;gap:24px;font-size:0.9rem">
          <span><strong id="user-stat-posts">0</strong> <span style="color:var(--muted)">posts</span></span>
          <span><strong id="user-stat-likes">0</strong> <span style="color:var(--muted)">likes reçus</span></span>
        </div>
        <button onclick="showView('feed')" style="margin-top:16px;width:auto;padding:8px 18px;border-radius:50px;background:transparent;border:1px solid var(--border);color:var(--text);font-size:0.85rem">← Retour</button>
      </div>
      <div id="user-posts"></div>
    </div>

  </div>

  <script src="app.js"></script>
</body>
</html>
