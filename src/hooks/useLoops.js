import { useEffect, useMemo, useState } from 'react'

export function useLoops() {
  const [loops, setLoops] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/loops/manifest.json', { cache: 'no-store' })
      .then(response => response.ok ? response.json() : [])
      .then(data => {
        if (!alive) return
        setLoops(Array.isArray(data) ? data.filter(item => item?.src && item?.name) : [])
      })
      .catch(() => alive && setLoops([]))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [])

  const bySrc = useMemo(() => new Map(loops.map(loop => [loop.src, loop])), [loops])
  return { loops, loading, bySrc }
}
