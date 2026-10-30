import { useEffect, useState } from 'react'
import { getArtworkUrl } from '../lib/artworkStore.js'

export function ArtworkImage({ art, width, height, hatchUnit, scale, draggable = false }) {
  const [url, setUrl] = useState(null)
  const [missing, setMissing] = useState(false)
  const blobId = art?.blobId

  useEffect(() => {
    let live = true
    setUrl(null)
    setMissing(false)
    if (!blobId) {
      setMissing(true)
      return
    }
    getArtworkUrl(blobId)
      .then((next) => {
        if (!live) return
        if (next) setUrl(next)
        else setMissing(true)
      })
      .catch(() => {
        if (live) setMissing(true)
      })
    return () => {
      live = false
    }
  }, [blobId])

  const style = {
    width: `${width}${hatchUnit}`,
    height: `${height}${hatchUnit}`,
    objectFit: art?.fit === 'cover' ? 'cover' : 'contain',
    display: 'block',
    pointerEvents: 'none',
  }

  if (missing) {
    return (
      <div
        aria-label={art?.name ? `Missing artwork: ${art.name}` : 'Missing artwork'}
        style={{
          width: `${width}${hatchUnit}`,
          height: `${height}${hatchUnit}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'repeating-linear-gradient(45deg, #2b2b35 0 8px, #1e1e27 8px 16px)',
          color: '#E3FF33',
          fontFamily: 'monospace',
          fontSize: `${Math.max(9, 10 * scale)}${hatchUnit === 'px' ? 'px' : 'pt'}`,
          textAlign: 'center',
          padding: 4,
        }}
      >
        Missing artwork — re-upload “{art?.name || 'file'}”
      </div>
    )
  }

  if (!url) return null
  return (
    <img
      src={url}
      alt={art?.name || 'Uploaded artwork'}
      draggable={draggable}
      style={style}
    />
  )
}
