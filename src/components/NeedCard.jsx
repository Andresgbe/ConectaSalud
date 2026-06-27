import { useState } from 'react'
import { supabase } from '../supabaseClient.js'

const URGENCIA_LABEL = {
  urgente: '🆘 Urgente: no queda',
  alta: '🔴 Alta',
  mediana: '🟡 Mediana',
  baja: '🟢 Baja',
}
const STATUS_LABEL = { pendiente: 'Pendiente', en_proceso: 'En proceso', cubierto: 'Cubierto' }

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'hace un momento'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs} h`
  return `hace ${Math.floor(hrs / 24)} d`
}

export default function NeedCard({ need, onChanged }) {
  const [claiming, setClaiming] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function confirmClaim() {
    if (!name.trim()) return
    setBusy(true)
    await supabase.rpc('reclamar_necesidad', { p_id: need.id, p_nombre: name.trim() })
    setBusy(false)
    setClaiming(false)
    onChanged?.()
  }

  async function markCovered() {
    setBusy(true)
    await supabase.rpc('marcar_cubierto', { p_id: need.id })
    setBusy(false)
    onChanged?.()
  }

  async function undo() {
    setBusy(true)
    await supabase.rpc('deshacer_necesidad', { p_id: need.id })
    setBusy(false)
    onChanged?.()
  }

  return (
    <div className={`need-card u-${need.urgencia}`}>
      <div className="need-top">
        <h3>{need.hospital}</h3>
        <span className={`tag u-${need.urgencia}`}>{URGENCIA_LABEL[need.urgencia]}</span>
      </div>
      <div className="need-meta">
        publicado {timeAgo(need.creado_en)}
      </div>
      <div className="need-insumo">
        <b>{need.insumo}</b>{need.cantidad ? ` — ${need.cantidad}` : ''}
      </div>
      {need.notas && <div className="need-notas">{need.notas}</div>}
      <div className="need-meta">📞 Contacto: {need.contacto}</div>

      <div className="status-line">
        <span className={`status-chip ${need.estado_cobertura}`}>
          {STATUS_LABEL[need.estado_cobertura]}
          {need.cubierto_por ? ` · ${need.cubierto_por}` : ''}
        </span>

        {need.estado_cobertura === 'pendiente' && (
          <button className="claim-btn" disabled={busy} onClick={() => setClaiming((v) => !v)}>
            Voy a llevarlo
          </button>
        )}
        {need.estado_cobertura === 'en_proceso' && (
          <>
            <button className="cover-btn" disabled={busy} onClick={markCovered}>Marcar como cubierto</button>
            <button className="undo-btn" disabled={busy} onClick={undo}>Deshacer</button>
          </>
        )}
        {need.estado_cobertura === 'cubierto' && (
          <button className="undo-btn" disabled={busy} onClick={undo}>Deshacer</button>
        )}
      </div>

      {claiming && (
        <div className="claim-form open">
          <input
            type="text" placeholder="Tu nombre u organización"
            value={name} onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button disabled={busy} onClick={confirmClaim}>Confirmar</button>
        </div>
      )}
    </div>
  )
}