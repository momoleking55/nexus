// ── Follow / Unfollow ──
async function toggleFollow(username) {
  const btn = document.getElementById('follow-btn')

  const { data: existing } = await db
    .from('follows')
    .select('id')
    .eq('follower', currentUser.username)
    .eq('following', username)
    .single()

  if (existing) {
    await db.from('follows').delete().eq('id', existing.id)
    btn.textContent      = '+ Suivre'
    btn.style.background = 'var(--accent)'
    btn.style.border     = 'none'
    btn.style.color      = '#fff'
  } else {
    await db.from('follows').insert({
      follower:  currentUser.username,
      following: username
    })
    btn.textContent      = '✓ Suivi'
    btn.style.background = 'transparent'
    btn.style.border     = '1px solid var(--border)'
    btn.style.color      = 'var(--muted)'
  }

  const { count } = await db
    .from('follows')
    .select('*', { count: 'exact' })
    .eq('following', username)

  document.getElementById('followers-count').textContent = count || 0
}
