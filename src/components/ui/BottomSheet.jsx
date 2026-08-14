import { useRef, useState } from 'react'

/**
 * action?: { label: string, onPress: () => void }
 * Shows a tappable label on the right side of the sheet header (before the ✕ close button).
 */
export default function BottomSheet({ open, onClose, title, subtitle, action, children }) {
  const sheetRef = useRef(null)
  const dragStartY = useRef(0)
  const dragStartTime = useRef(0)
  const activePointerId = useRef(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [closing, setClosing] = useState(false)

  const beginDrag = (event) => {
    if (closing) return

    activePointerId.current = event.pointerId
    dragStartY.current = event.clientY
    dragStartTime.current = performance.now()
    setDragging(true)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const moveDrag = (event) => {
    if (!dragging || event.pointerId !== activePointerId.current) return

    const nextOffset = Math.max(0, event.clientY - dragStartY.current)
    setDragOffset(nextOffset)
  }

  const finishDrag = (event) => {
    if (!dragging || event.pointerId !== activePointerId.current) return

    const elapsed = Math.max(performance.now() - dragStartTime.current, 1)
    const velocity = dragOffset / elapsed
    const shouldClose = dragOffset > 90 || velocity > 0.65

    setDragging(false)
    activePointerId.current = null

    if (shouldClose) {
      setClosing(true)
      const sheetHeight = sheetRef.current?.offsetHeight || window.innerHeight
      setDragOffset(sheetHeight)
      window.setTimeout(onClose, 220)
    } else {
      setDragOffset(0)
    }
  }

  const cancelDrag = () => {
    if (!dragging) return
    setDragging(false)
    activePointerId.current = null
    setDragOffset(0)
  }

  const sheetStyle = dragOffset > 0
    ? {
        transform: `translateY(${dragOffset}px)`,
        transition: dragging ? 'none' : undefined,
      }
    : undefined

  return (
    <div className={`overlay ${open ? 'open' : ''}`} onClick={onClose}>
      <div
        ref={sheetRef}
        className={`sheet ${dragging ? 'dragging' : ''}`}
        style={sheetStyle}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="sheet-drag-zone"
          role="button"
          tabIndex={0}
          aria-label="Swipe down to close"
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
          onPointerCancel={cancelDrag}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
              event.preventDefault()
              onClose()
            }
          }}
        >
          <div className="sheet-handle" />
        </div>
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
