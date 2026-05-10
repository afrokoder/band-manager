/**
 * Avatar — shows a profile photo if available, falls back to colored initial.
 * Props:
 *   photoURL  string | null
 *   initial   string  (single character, uppercase)
 *   color     string  (CSS color for fallback background)
 *   size      'sm' | 'md' | 'lg'   default: 'md'
 *   style     object  (extra inline styles)
 */
export default function Avatar({ photoURL, initial, color, size = 'md', style = {} }) {
  const dim = size === 'lg' ? 44 : size === 'sm' ? 20 : 24
  const fontSize = size === 'lg' ? 18 : size === 'sm' ? 9 : 10

  const base = {
    width: dim,
    height: dim,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...style,
  }

  if (photoURL) {
    return (
      <div style={base}>
        <img
          src={photoURL}
          alt={initial || '?'}
          referrerPolicy="no-referrer"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => {
            // If image fails, swap to initial fallback
            e.currentTarget.style.display = 'none'
            e.currentTarget.parentElement.style.background = color || '#999'
            e.currentTarget.parentElement.setAttribute('data-initial', initial || '?')
          }}
        />
      </div>
    )
  }

  return (
    <div style={{ ...base, background: color || '#999', fontSize, fontWeight: 700, color: '#fff' }}>
      {initial || '?'}
    </div>
  )
}
