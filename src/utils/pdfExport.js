import config from '../config'

function safeFileName(value) {
  return String(value || 'set-list')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'set-list'
}

function displayTimestamp(value) {
  const date = value?.toDate?.() || (value instanceof Date ? value : null)
  if (!date) return ''
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function cleanUrl(value) {
  if (!value) return ''
  try {
    const parsed = new URL(value)
    return parsed.toString()
  } catch {
    return String(value)
  }
}

export async function createSetlistPdfFile(setlist, librarySongs = []) {
  const module = await import('jspdf')
  const jsPDF = module.jsPDF || module.default?.jsPDF || module.default
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 44
  const contentW = pageW - margin * 2
  const accent = [0, 113, 227]
  const ink = [29, 29, 31]
  const muted = [103, 103, 108]
  const soft = [245, 247, 250]
  const rule = [222, 224, 228]
  let y = 0

  const footerH = 30
  const pageBottom = pageH - footerH - 18

  const addPage = () => {
    doc.addPage()
    y = 48
  }

  const ensureSpace = needed => {
    if (y + needed <= pageBottom) return
    addPage()
  }

  const textLines = (text, width, size = 11) => {
    doc.setFontSize(size)
    return doc.splitTextToSize(String(text || ''), width)
  }

  const sectionLabel = label => {
    ensureSpace(36)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...accent)
    doc.text(String(label).toUpperCase(), margin, y)
    y += 10
    doc.setDrawColor(...rule)
    doc.setLineWidth(0.7)
    doc.line(margin, y, pageW - margin, y)
    y += 18
  }

  const drawPill = (label, value, x, top, width) => {
    if (!value) return
    doc.setFillColor(...soft)
    doc.roundedRect(x, top, width, 47, 7, 7, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.setTextColor(...muted)
    doc.text(String(label).toUpperCase(), x + 10, top + 16)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...ink)
    const lines = doc.splitTextToSize(String(value), width - 20).slice(0, 2)
    doc.text(lines, x + 10, top + 33)
  }

  const drawMetaRow = (label, value) => {
    if (!value) return
    const labelW = 112
    const lines = textLines(value, contentW - labelW, 11)
    const h = Math.max(20, lines.length * 14)
    ensureSpace(h + 4)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...muted)
    doc.text(label, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(...ink)
    doc.text(lines, margin + labelW, y)
    y += h
  }

  const drawParagraphCard = (title, text) => {
    if (!text) return
    const lines = textLines(text, contentW - 28, 11.5)
    const h = 36 + lines.length * 15
    ensureSpace(h + 12)
    doc.setFillColor(...soft)
    doc.roundedRect(margin, y, contentW, h, 9, 9, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...muted)
    doc.text(title.toUpperCase(), margin + 14, y + 20)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11.5)
    doc.setTextColor(...ink)
    doc.text(lines, margin + 14, y + 39)
    y += h + 12
  }

  const drawLink = (label, url, x, top) => {
    if (!url) return 0
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...accent)
    const display = `${label}  ›`
    doc.textWithLink(display, x, top, { url: cleanUrl(url) })
    return doc.getTextWidth(display) + 18
  }

  const drawHeader = () => {
    doc.setFillColor(...accent)
    doc.rect(0, 0, pageW, 112, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text((config.orgName || 'Amazing Grace Church').toUpperCase(), margin, 28)

    const title = setlist.title || `${setlist.section || ''} Set List`
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(23)
    const titleLines = doc.splitTextToSize(title, contentW).slice(0, 2)
    doc.text(titleLines, margin, 58)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    const serviceLine = [setlist.serviceDateStr || 'Service', setlist.section].filter(Boolean).join('  •  ')
    doc.text(serviceLine, margin, 96)
    y = 138
  }

  drawHeader()

  // At-a-glance set information. Larger type and compact cards make this
  // readable on a phone when the PDF is opened from the share sheet.
  const pillGap = 8
  const pillW = (contentW - pillGap * 2) / 3
  const pills = [
    ['Set key', setlist.setKey || '—'],
    ['Tempo', setlist.tempo ? `${setlist.tempo} BPM` : '—'],
    ['Songs', String((setlist.songs || []).length)],
  ]
  pills.forEach((item, index) => drawPill(item[0], item[1], margin + index * (pillW + pillGap), y, pillW))
  y += 67

  sectionLabel('Set details')
  drawMetaRow('Service date', setlist.serviceDateStr)
  drawMetaRow('Section', setlist.section)
  drawMetaRow('Loop track', setlist.loopName)
  drawMetaRow('Submitted by', setlist.submittedByName || setlist.createdByName)
  drawMetaRow('Submitted', displayTimestamp(setlist.submittedAt || setlist.createdAt))
  drawMetaRow('Last edited by', setlist.lastEditedByName)
  drawMetaRow('Last edited', displayTimestamp(setlist.lastEditedAt || setlist.updatedAt))

  if (setlist.attachment?.url || setlist.voiceMemo?.url) {
    ensureSpace(40)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...muted)
    doc.text('SET MEDIA', margin, y)
    let linkX = margin + 112
    linkX += drawLink(setlist.attachment?.name || 'Attachment', setlist.attachment?.url, linkX, y)
    drawLink('Voice memo', setlist.voiceMemo?.url, linkX, y)
    y += 24
  }

  drawParagraphCard('Team notes', setlist.notes)

  sectionLabel(`Songs · ${(setlist.songs || []).length}`)

  const libraryById = new Map(librarySongs.map(song => [song.id, song]))
  ;(setlist.songs || []).forEach((setSong, index) => {
    const librarySong = libraryById.get(setSong.songId) || {}
    const song = { ...librarySong, ...setSong }

    const chips = [
      song.key && `Key ${song.key}`,
      song.bpm && `${song.bpm} BPM`,
      ...(Array.isArray(song.tags) ? song.tags.slice(0, 3) : []),
    ].filter(Boolean)
    const noteLines = song.notes ? textLines(song.notes, contentW - 38, 10.5) : []
    const cardH = 66 + (chips.length ? 22 : 0) + (noteLines.length ? 21 + noteLines.length * 13 : 0) + ((song.youtubeUrl || song.link || song.attachment?.url || song.voiceMemo?.url) ? 27 : 0)
    ensureSpace(cardH + 12)

    const cardTop = y
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...rule)
    doc.setLineWidth(0.8)
    doc.roundedRect(margin, cardTop, contentW, cardH, 10, 10, 'FD')

    doc.setFillColor(...accent)
    doc.circle(margin + 24, cardTop + 28, 15, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(255, 255, 255)
    doc.text(String(index + 1), margin + 24, cardTop + 32, { align: 'center' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...ink)
    const titleLines = doc.splitTextToSize(song.title || 'Untitled song', contentW - 75).slice(0, 2)
    doc.text(titleLines, margin + 50, cardTop + 24)

    let cursorY = cardTop + 54
    if (chips.length) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(...muted)
      doc.text(chips.join('   •   '), margin + 18, cursorY)
      cursorY += 22
    }

    if (noteLines.length) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...muted)
      doc.text('NOTES', margin + 18, cursorY)
      cursorY += 14
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10.5)
      doc.setTextColor(...ink)
      doc.text(noteLines, margin + 18, cursorY)
      cursorY += noteLines.length * 13 + 7
    }

    // Lyrics are intentionally omitted from the shared PDF. The PDF is a
    // concise service/set reference, while full lyrics remain in Band Manager.
    if (song.youtubeUrl || song.link || song.attachment?.url || song.voiceMemo?.url) {
      let linkX = margin + 18
      const linkY = cardTop + cardH - 16
      linkX += drawLink('YouTube', song.youtubeUrl || song.link, linkX, linkY)
      linkX += drawLink(song.attachment?.name || 'Song file', song.attachment?.url, linkX, linkY)
      drawLink('Voice memo', song.voiceMemo?.url, linkX, linkY)
    }

    y += cardH + 12
  })

  const totalPages = doc.getNumberOfPages()
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(...rule)
    doc.setLineWidth(0.6)
    doc.line(margin, pageH - footerH - 2, pageW - margin, pageH - footerH - 2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...muted)
    doc.text(`${config.orgName || 'Band Manager'} · Set List`, margin, pageH - 16)
    doc.text(`Page ${page} of ${totalPages}`, pageW - margin, pageH - 16, { align: 'right' })
  }

  const blob = doc.output('blob')
  const name = `${safeFileName(setlist.serviceDateStr)}-${safeFileName(setlist.section)}-set-list.pdf`
  return new File([blob], name, { type: 'application/pdf' })
}

export function downloadPdfFile(file) {
  const url = URL.createObjectURL(file)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file.name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
