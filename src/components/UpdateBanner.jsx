import { useEffect, useState } from 'react'

const REVISION_MS = 5 * 60 * 1000

export default function UpdateBanner() {
  const [desactualizada, setDesactualizada] = useState(false)

  useEffect(() => {
    async function revisarVersion() {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' })
        const data = await res.json()
        if (data.version && data.version !== __APP_VERSION__) setDesactualizada(true)
      } catch {
        // sin conexión: no interrumpir al usuario
      }
    }

    function alVolverVisible() {
      if (document.visibilityState === 'visible') revisarVersion()
    }

    revisarVersion()
    const interval = setInterval(revisarVersion, REVISION_MS)
    document.addEventListener('visibilitychange', alVolverVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', alVolverVisible)
    }
  }, [])

  if (!desactualizada) return null

  return (
    <div className="update-banner">
      <span>Hay una nueva versión de la página. Actualiza para evitar errores al reportar.</span>
      <button type="button" onClick={() => window.location.reload()}>Actualizar ahora</button>
    </div>
  )
}
