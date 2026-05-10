/**
 * action?: { label: string, onPress: () => void }
 * Shows a tappable label on the right side of the sheet header (before the ✕ close button).
 */
export default function BottomSheet({ open, onClose, title, subtitle, action, children }) {
  return (
    <div className={`overlay ${open ? 'open' : ''}`} onClick={onClose}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-head">
          <div>
            <div className="sheet-title">{title}</div>
            {subtitle && <div className="sheet-subtitle">{subtitle}</div>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {action && (
              <button onClick={action.onPress}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '4px 2px' }}>
                {action.label}
              </button>
            )}
            <button className="sheet-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}
