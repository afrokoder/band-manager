import { isValidElement, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * action — either { label, onPress } object OR any ReactNode (e.g. a ··· menu)
 */
export default function BottomSheet({ open, onClose, title, subtitle, action, children }) {
  const sheetRef = useRef(null)
  const dragStartY = useRef(0)
  const dragStartTime = useRef(0)
  const activePointerId = useRef(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    if (open) {
      setDragOffset(0)
      setDragging(false)
      setClosing(false)
    }
  }, [open])

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
    setDragOffset(Math.max(0, event.clientY - dragStartY.current))
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
      window.setTimeout(() => {
        onClose()
        setDragOffset(0)
        setClosing(false)
      }, 220)
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

  const actionNode = action
    ? isValidElement(action)
      ? action
      : (
        <button onClick={action.onPress}
          style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '4px 2px' }}>
          {action.label}
        </button>
      )
    : null

  const sheet = (
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
            {actionNode}
            <button className="sheet-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )

  // Render sheets at document.body so they cannot be clipped by the app's
  // scroll container or appear underneath the persistent tab bar on iOS.
  return createPortal(sheet, document.body)
}
