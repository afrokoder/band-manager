export const NOTE_NAMES = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B']

export function frequencyToNote(frequency) {
  if (!frequency || !Number.isFinite(frequency)) return null
  const midi = Math.round(69 + 12 * Math.log2(frequency / 440))
  const note = NOTE_NAMES[(midi % 12 + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  const exact = 440 * Math.pow(2, (midi - 69) / 12)
  const cents = Math.round(1200 * Math.log2(frequency / exact))
  return { midi, note, octave, cents, frequency }
}

export function autoCorrelate(buffer, sampleRate) {
  let size = buffer.length
  let rms = 0
  for (let i = 0; i < size; i += 1) rms += buffer[i] * buffer[i]
  rms = Math.sqrt(rms / size)
  if (rms < 0.012) return -1

  let r1 = 0
  let r2 = size - 1
  const threshold = 0.2
  for (let i = 0; i < size / 2; i += 1) {
    if (Math.abs(buffer[i]) < threshold) { r1 = i; break }
  }
  for (let i = 1; i < size / 2; i += 1) {
    if (Math.abs(buffer[size - i]) < threshold) { r2 = size - i; break }
  }

  const slice = buffer.slice(r1, r2)
  size = slice.length
  const correlations = new Array(size).fill(0)
  for (let lag = 0; lag < size; lag += 1) {
    for (let i = 0; i < size - lag; i += 1) correlations[lag] += slice[i] * slice[i + lag]
  }

  let dip = 0
  while (dip + 1 < size && correlations[dip] > correlations[dip + 1]) dip += 1
  let maxValue = -1
  let maxPos = -1
  for (let i = dip; i < size; i += 1) {
    if (correlations[i] > maxValue) { maxValue = correlations[i]; maxPos = i }
  }
  if (maxPos <= 0) return -1

  let period = maxPos
  const x1 = correlations[maxPos - 1] || correlations[maxPos]
  const x2 = correlations[maxPos]
  const x3 = correlations[maxPos + 1] || correlations[maxPos]
  const a = (x1 + x3 - 2 * x2) / 2
  const b = (x3 - x1) / 2
  if (a) period -= b / (2 * a)
  return sampleRate / period
}
