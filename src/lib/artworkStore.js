const DB_NAME = 'tile-banner-studio'
const DB_VERSION = 1
const STORE = 'artwork'

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Could not open artwork database.'))
  })
}

function tx(db, mode) {
  return db.transaction(STORE, mode).objectStore(STORE)
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Artwork database request failed.'))
  })
}

export function createArtworkId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `art-${crypto.randomUUID()}`
  }
  return `art-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffff).toString(36)}`
}

export async function putArtwork(record) {
  const db = await openDb()
  try {
    await requestToPromise(tx(db, 'readwrite').put({ ...record, updatedAt: Date.now() }))
  } finally {
    db.close()
  }
  return record.id
}

export async function getArtwork(id) {
  if (!id) return null
  const db = await openDb()
  try {
    return (await requestToPromise(tx(db, 'readonly').get(id))) || null
  } finally {
    db.close()
  }
}

export async function deleteArtwork(id) {
  if (!id) return
  const db = await openDb()
  try {
    await requestToPromise(tx(db, 'readwrite').delete(id))
  } finally {
    db.close()
  }
}

export async function hasArtwork(id) {
  return (await getArtwork(id)) != null
}

const urlCache = new Map()

export async function getArtworkUrl(id) {
  if (!id) return null
  const cached = urlCache.get(id)
  if (cached) return cached
  const record = await getArtwork(id)
  if (!record?.blob) return null
  const url = URL.createObjectURL(record.blob)
  urlCache.set(id, url)
  return url
}

export function dropArtworkUrl(id) {
  const url = urlCache.get(id)
  if (url) {
    URL.revokeObjectURL(url)
    urlCache.delete(id)
  }
}

const imageCache = new Map()
const imageListeners = new Set()

export function subscribeArtworkImages(listener) {
  imageListeners.add(listener)
  return () => {
    imageListeners.delete(listener)
  }
}

function notifyArtworkImages() {
  for (const listener of imageListeners) {
    try {
      listener()
    } catch {
      /* a stale preview listener must not break the load */
    }
  }
}

export function peekArtworkImage(id) {
  const entry = imageCache.get(id)
  return entry?.ready ? entry.img : null
}

export function ensureArtworkImage(id) {
  if (!id) return Promise.resolve(null)
  const existing = imageCache.get(id)
  if (existing) return existing.promise
  const entry = { img: null, ready: false, promise: null }
  entry.promise = (async () => {
    const url = await getArtworkUrl(id)
    if (!url) throw new Error('Artwork is no longer stored.')
    const img = await new Promise((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('Could not display that artwork.'))
      element.src = url
    })
    entry.img = img
    entry.ready = true
    notifyArtworkImages()
    return img
  })()
  entry.promise.catch(() => {
    imageCache.delete(id)
    notifyArtworkImages()
  })
  imageCache.set(id, entry)
  return entry.promise
}
