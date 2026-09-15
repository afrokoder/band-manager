export const GAME_LEVELS = [
  { level: 1, name: 'Listener', min: 0 },
  { level: 2, name: 'Learner', min: 1500 },
  { level: 3, name: 'Growing Musician', min: 5000 },
  { level: 4, name: 'Skilled Servant', min: 12000 },
  { level: 5, name: 'Worship Leader', min: 25000 },
  { level: 6, name: 'Music Mentor', min: 50000 },
  { level: 7, name: 'Section Leader', min: 90000 },
  { level: 8, name: 'Worship Captain', min: 150000 },
  { level: 9, name: 'Master Musician', min: 250000 },
  { level: 10, name: 'AGM Legend', min: 400000 },
]

export function getGameLevel(points = 0) {
  const safePoints = Math.max(0, Number(points) || 0)
  let current = GAME_LEVELS[0]
  for (const level of GAME_LEVELS) if (safePoints >= level.min) current = level
  const index = GAME_LEVELS.findIndex(item => item.level === current.level)
  const next = GAME_LEVELS[index + 1] || null
  const progress = next ? Math.min(100, Math.round(((safePoints-current.min)/(next.min-current.min))*100)) : 100
  return { ...current, points:safePoints, next, progress }
}
