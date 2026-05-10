/**
 * Extract YouTube video ID from any common URL format.
 * Handles:
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtu.be/VIDEO_ID
 *   https://youtube.com/shorts/VIDEO_ID
 *   https://www.youtube.com/embed/VIDEO_ID
 *   https://music.youtube.com/watch?v=VIDEO_ID
 */
export function extractYouTubeId(url) {
  if (!url) return null
  const str = url.trim()
  // youtu.be short links
  const short = str.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)
  if (short) return short[1]
  // standard & shorts & embed
  const long = str.match(/(?:v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/)
  if (long) return long[1]
  return null
}

export function youtubeThumbnail(videoId, quality = 'hq') {
  if (!videoId) return null
  const key = quality === 'max' ? 'maxresdefault' : 'hqdefault'
  return `https://img.youtube.com/vi/${videoId}/${key}.jpg`
}

export function youtubeEmbedUrl(videoId) {
  if (!videoId) return null
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`
}
