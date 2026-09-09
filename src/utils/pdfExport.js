import config from '../config'

function safeFileName(value) {
  return String(value || 'set-list').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'set-list'
}

function displayDate(value) {
  if (!value) return ''
  const parsed = new Date(`${value}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function cleanUrl(value) {
  if (!value) return ''
  try { return new URL(value).toString() } catch { return String(value) }
}

function titleCase(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

export async function createSetlistPdfFile(setlist, librarySongs = []) {
  const module = await import('jspdf')
  const jsPDF = module.jsPDF || module.default?.jsPDF || module.default
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })

  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 38
  const contentW = pageW - margin * 2
  const pageBottom = pageH - 44

  const navy = [4, 49, 91]
  const navy2 = [3, 67, 120]
  const blue = [0, 113, 227]
  const ink = [20, 42, 66]
  const muted = [84, 105, 127]
  const soft = [244, 248, 252]
  const softBlue = [235, 244, 253]
  const border = [222, 231, 240]
  const white = [255, 255, 255]

  const libraryById = new Map(librarySongs.map(song => [song.id, song]))
  const songs = (setlist.songs || []).map(setSong => ({ ...libraryById.get(setSong.songId), ...setSong }))

  let y = 0
  let pageNumber = 1

  const setFont = (family = 'helvetica', style = 'normal', size = 11, color = ink) => {
    doc.setFont(family, style)
    doc.setFontSize(size)
    doc.setTextColor(...color)
  }

  const split = (text, width, size = 11, family = 'helvetica', style = 'normal') => {
    doc.setFont(family, style)
    doc.setFontSize(size)
    return doc.splitTextToSize(String(text || ''), width)
  }

  const footer = () => {
    doc.setDrawColor(...border)
    doc.setLineWidth(0.6)
    doc.line(margin, pageH - 28, pageW - margin, pageH - 28)
    setFont('helvetica', 'normal', 8.5, muted)
    doc.text(`${config.orgName || 'Band Manager'} · Set List`, margin, pageH - 14)
    doc.text(String(pageNumber), pageW - margin, pageH - 14, { align: 'right' })
  }

  const addContinuationPage = () => {
    footer()
    doc.addPage()
    pageNumber += 1
    doc.setFillColor(...navy)
    doc.rect(0, 0, pageW, 54, 'F')
    setFont('helvetica', 'bold', 10, white)
    doc.text((config.orgFullName || config.orgName || 'Band Manager').toUpperCase(), margin, 22)
    setFont('helvetica', 'normal', 9.5, white)
    doc.text(`${setlist.serviceDateStr || ''}${setlist.section ? `  ·  ${setlist.section}` : ''}`, margin, 39)
    y = 78
  }

  const ensure = needed => {
    if (y + needed > pageBottom) addContinuationPage()
  }

  const drawFirstPageHeader = () => {
    const headerH = 205
    doc.setFillColor(...navy)
    doc.rect(0, 0, pageW, headerH, 'F')
    doc.setFillColor(...navy2)
    doc.rect(0, 0, pageW, 8, 'F')

    doc.setFillColor(5, 59, 107)
    doc.triangle(0, 126, pageW * 0.58, 72, pageW * 0.48, headerH, 'F')
    doc.setFillColor(4, 72, 128)
    doc.triangle(pageW * 0.40, headerH, pageW, 106, pageW, headerH, 'F')

    setFont('times', 'italic', 24, white)
    doc.text('AGM', margin, 48)
    setFont('helvetica', 'bold', 8.5, [220, 236, 250])
    doc.text('BAND MANAGER', margin + 2, 65)

    setFont('helvetica', 'bold', 13, white)
    doc.text('SUNDAY SET LIST', pageW - margin, 42, { align: 'right' })
    setFont('helvetica', 'normal', 10.5, [229, 240, 251])
    const serviceInfo = [displayDate(setlist.serviceDateStr), setlist.section].filter(Boolean)
    serviceInfo.forEach((line, index) => doc.text(String(line).toUpperCase(), pageW - margin, 61 + index * 16, { align: 'right' }))

    const setTitle = setlist.title || `${setlist.section || 'Sunday'} Set List`
    const titleLines = split(setTitle, contentW - 70, 27, 'times', 'italic').slice(0, 2)
    setFont('times', 'italic', 27, white)
    doc.text(titleLines, pageW / 2, 127, { align: 'center' })

    setFont('helvetica', 'bold', 9.5, [227, 239, 250])
    const details = [
      setlist.setKey ? `SET KEY: ${setlist.setKey}` : '',
      `${songs.length} SONG${songs.length === 1 ? '' : 'S'}`,
    ].filter(Boolean).join('   ·   ')
    doc.text(details, pageW / 2, 174, { align: 'center' })

    y = headerH + 25
  }

  const drawNotes = () => {
    if (!setlist.notes) return
    const lines = split(setlist.notes, contentW - 34, 10.5)
    const h = 36 + lines.length * 14
    ensure(h + 16)
    doc.setFillColor(...softBlue)
    doc.roundedRect(margin, y, contentW, h, 12, 12, 'F')
    setFont('helvetica', 'bold', 9, navy2)
    doc.text('TEAM NOTES', margin + 17, y + 19)
    setFont('helvetica', 'normal', 10.5, ink)
    doc.text(lines, margin + 17, y + 39)
    y += h + 18
  }

  const drawSongList = () => {
    ensure(54)
    setFont('helvetica', 'bold', 12, navy)
    doc.text('SONGS', margin, y + 2)
    y += 18

    songs.forEach((song, index) => {
      const title = song.title || 'Untitled Song'
      const titleLines = split(title, contentW - 82, 13.5, 'helvetica', 'bold').slice(0, 2)
      const rowH = Math.max(54, 26 + titleLines.length * 14)
      ensure(rowH + 8)

      doc.setFillColor(...soft)
      doc.roundedRect(margin, y, contentW, rowH, 10, 10, 'F')
      doc.setFillColor(...navy2)
      doc.roundedRect(margin + 10, y + 9, 38, 38, 7, 7, 'F')
      setFont('helvetica', 'bold', 15, white)
      doc.text(String(index + 1), margin + 29, y + 34, { align: 'center' })

      setFont('helvetica', 'bold', 13.5, ink)
      doc.text(titleLines, margin + 60, y + 22)
      if (song.author) {
        setFont('helvetica', 'normal', 10, muted)
        doc.text(song.author, margin + 60, y + 22 + titleLines.length * 14)
      }
      y += rowH + 8
    })
    y += 10
  }

  const drawLyricsSongHeader = (song, index) => {
    const numberW = 50
    ensure(64)
    const cardTop = y

    doc.setFillColor(...navy2)
    doc.roundedRect(margin, cardTop, numberW, 46, 8, 8, 'F')
    setFont('helvetica', 'bold', 18, white)
    doc.text(String(index + 1), margin + numberW / 2, cardTop + 30, { align: 'center' })

    const titleX = margin + numberW + 14
    const titleWidth = contentW - numberW - 26
    const titleLines = split(song.title || 'Untitled Song', titleWidth, 14.5, 'helvetica', 'bold').slice(0, 2)
    setFont('helvetica', 'bold', 14.5, ink)
    doc.text(titleLines, titleX, cardTop + 17)

    if (song.author) {
      setFont('helvetica', 'normal', 10, muted)
      doc.text(song.author, titleX, cardTop + 21 + titleLines.length * 14)
    }

    y = cardTop + 58
  }

  const drawMediaLinks = song => {
    const links = [
      ['YouTube', song.youtubeUrl || song.link],
      [song.attachment?.name || 'Song File', song.attachment?.url],
      ['Voice Memo', song.voiceMemo?.url],
    ].filter(([, url]) => Boolean(url))
    if (!links.length) return

    ensure(24)
    let x = margin + 64
    setFont('helvetica', 'bold', 8.8, blue)
    links.forEach(([label, url], idx) => {
      const text = idx === 0 ? label : `  ·  ${label}`
      doc.textWithLink(text, x, y, { url: cleanUrl(url) })
      x += doc.getTextWidth(text)
    })
    y += 16
  }

  const drawLyrics = song => {
    const sections = Array.isArray(song.sections) ? song.sections : []
    const lyricSections = sections.filter(section => String(section.lyrics || '').trim())

    if (!lyricSections.length) {
      ensure(54)
      doc.setFillColor(...soft)
      doc.roundedRect(margin + 64, y, contentW - 64, 42, 8, 8, 'F')
      setFont('helvetica', 'italic', 10.5, muted)
      doc.text('No lyrics saved for this song.', margin + 78, y + 25)
      y += 58
      return
    }

    lyricSections.forEach(section => {
      const lyricText = String(section.lyrics || '').trim()
      const heading = titleCase(section.label || '')
      const lyricWidth = contentW - 96
      const lyricLines = split(lyricText, lyricWidth, 11.5, 'helvetica', 'normal')
      let cursor = 0
      let isFirstChunk = true

      while (cursor < lyricLines.length) {
        const headingH = isFirstChunk && heading ? 18 : 0
        if (pageBottom - y < 72) addContinuationPage()

        const roomLines = Math.max(3, Math.floor((pageBottom - y - headingH - 30) / 15))
        const take = Math.min(roomLines, lyricLines.length - cursor)
        const chunk = lyricLines.slice(cursor, cursor + take)
        const blockH = 25 + headingH + chunk.length * 15

        doc.setFillColor(...soft)
        doc.roundedRect(margin + 64, y, contentW - 64, blockH, 9, 9, 'F')
        let textY = y + 20
        if (isFirstChunk && heading) {
          setFont('helvetica', 'bold', 8.5, navy2)
          doc.text(heading.toUpperCase(), margin + 78, textY)
          textY += 18
        }
        setFont('helvetica', 'normal', 11.5, ink)
        doc.text(chunk, margin + 78, textY)
        y += blockH + 8
        cursor += take
        isFirstChunk = false

        if (cursor < lyricLines.length && pageBottom - y < 54) addContinuationPage()
      }
    })

    if (song.notes) {
      const noteLines = split(song.notes, contentW - 96, 9.5)
      const h = 24 + noteLines.length * 13
      ensure(h + 8)
      doc.setFillColor(...softBlue)
      doc.roundedRect(margin + 64, y, contentW - 64, h, 8, 8, 'F')
      setFont('helvetica', 'bold', 8, navy2)
      doc.text('SONG NOTES', margin + 78, y + 16)
      setFont('helvetica', 'normal', 9.5, ink)
      doc.text(noteLines, margin + 78, y + 32)
      y += h + 8
    }
  }

  drawFirstPageHeader()
  drawNotes()
  drawSongList()

  // Lyrics start after the complete song list. Each song gets one header only;
  // continuation pages simply continue the lyrics without repeating the title.
  if (songs.length) {
    addContinuationPage()
    setFont('helvetica', 'bold', 12, navy)
    doc.text('LYRICS', margin, y)
    y += 20
  }

  songs.forEach((song, index) => {
    ensure(86)
    drawLyricsSongHeader(song, index)
    drawMediaLinks(song)
    drawLyrics(song)
    y += 14
  })

  const scripture = '"Let everything that has breath praise the Lord."'
  const scriptureRef = 'PSALM 150:6'
  ensure(92)
  doc.setFillColor(...softBlue)
  doc.roundedRect(margin + 32, y, contentW - 64, 72, 12, 12, 'F')
  setFont('times', 'italic', 12.5, navy2)
  doc.text(scripture, pageW / 2, y + 30, { align: 'center' })
  setFont('helvetica', 'bold', 8.5, muted)
  doc.text(scriptureRef, pageW / 2, y + 51, { align: 'center' })
  y += 84

  footer()

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
