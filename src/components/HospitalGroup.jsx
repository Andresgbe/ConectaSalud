import { useState } from 'react'
import { supabase } from '../supabaseClient.js'

const URGENCIA_LABEL = {
  urgente: '🆘 Urgente: no queda',
  alta: '🔴 Alta',
  mediana: '🟡 Mediana',
  baja: '🟢 Baja',
}
const STATUS_LABEL = { pendiente: 'Pendiente', entregado: 'Entregado' }
const urgenciaRank = { urgente: 0, alta: 1, mediana: 2, baja: 3 }

function horaYrelativo(iso) {
  const fecha = new Date(iso)
  const hora = fecha.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' })
  const mins = Math.floor((Date.now() - fecha.getTime()) / 60000)
  const rel = mins < 1 ? 'hace un momento' : mins < 60 ? `hace ${mins} min` : `hace ${Math.floor(mins / 60)} h`
  return `a las ${hora} · ${rel}`
}

export default function HospitalGroup({ hospital, items, onChanged, isAdmin, adminCreds }) {
  const [selected, setSelected] = useState(new Set())
  const [claiming, setClaiming] = useState(false)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const pendientes = items.filter((i) => i.estado_cobertura === 'pendiente')
  const entregados = items
    .filter((i) => i.estado_cobertura === 'entregado')
    .sort((a, b) => new Date(b.actualizado_en) - new Date(a.actualizado_en))

  // Pendientes arriba, entregados siempre al final.
  const ordenados = [...pendientes, ...entregados]

  const topUrgencia = pendientes.length > 0
    ? pendientes.reduce(
        (top, it) => (urgenciaRank[it.urgencia] < urgenciaRank[top] ? it.urgencia : top),
        pendientes[0].urgencia
      )
    : 'baja'

  function toggle(id) {
    setSelected((s) => {
      const next = new Set(s)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAllPendientes() {
    setSelected(new Set(pendientes.map((i) => i.id)))
  }

  async function confirmClaimBatch() {
    if (!name.trim() || selected.size === 0) return
    setBusy(true)
    await supabase.rpc('reclamar_varios', { p_ids: Array.from(selected), p_nombre: name.trim() })
    setBusy(false)
    setClaiming(false)
    setSelected(new Set())
    setName('')
    onChanged?.()
  }

  async function undo(id) {
    setBusy(true)
    await supabase.rpc('deshacer_necesidad', { p_id: id })
    setBusy(false)
    onChanged?.()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este insumo permanentemente?')) return
    setBusy(true)
    await supabase.rpc('admin_eliminar_necesidad', {
      p_admin_id: adminCreds.identificador,
      p_admin_codigo: adminCreds.codigo,
      p_id: id,
    })
    setBusy(false)
    onChanged?.()
  }

  return (
    <div className={`need-card u-${topUrgencia}`}>
      <div className="need-top">
        <h3>{hospital}</h3>
      </div>
      <div className="need-meta">
        {items.length} insumo{items.length === 1 ? '' : 's'} · {pendientes.length} pendiente{pendientes.length === 1 ? '' : 's'}
      </div>

      <div className="item-list">
        {ordenados.map((it) => (
          <div className="item-row" key={it.id}>
            {it.estado_cobertura === 'pendiente' ? (
              <input
                type="checkbox" className="item-checkbox"
                checked={selected.has(it.id)}
                onChange={() => toggle(it.id)}
              />
            ) : (
              <span className="item-checkbox-placeholder">✅</span>
            )}
            <div className="item-content">
              <div className="item-line">
                <b>{it.insumo}</b>{it.cantidad ? ` — ${it.cantidad}` : ''}
                <span className={`tag-mini u-${it.urgencia}`}>{URGENCIA_LABEL[it.urgencia]}</span>
                {it.estado_cobertura === 'pendiente' && selected.has(it.id) && !claiming && (
                  <button className="claim-btn" style={{ marginLeft: 8 }} onClick={() => setClaiming(true)}>
                    Marcar como entregado
                  </button>
                )}
              </div>

              {it.estado_cobertura === 'pendiente' && selected.has(it.id) && claiming && (
                <div className="claim-form open">
                  <input
                    type="text" placeholder="Tu nombre u organización"
                    value={name} onChange={(e) => setName(e.target.value)}
                    autoFocus
                  />
                  <button disabled={busy} onClick={confirmClaimBatch}>Confirmar</button>
                  <button type="button" className="undo-btn" onClick={() => setClaiming(false)}>Cancelar</button>
                </div>
              )}
              {it.notas && <div className="need-notas">{it.notas}</div>}
              <div className="item-sub">
                {horaYrelativo(it.creado_en)}
                {it.contacto && <> · 📞 {it.contacto}</>}
                {it.estado_cobertura === 'entregado' && (
                  <>
                    {' · '}
                    <span className="status-chip entregado">
                      {STATUS_LABEL.entregado}{it.cubierto_por ? ` · ${it.cubierto_por}` : ''}
                    </span>
                    {' · '}
                    <button className="mini-link" disabled={busy} onClick={() => undo(it.id)}>Deshacer</button>
                  </>
                )}
                {isAdmin && (
                  <>
                    {' · '}
                    <button className="mini-link" style={{ color: 'var(--rojo)' }} disabled={busy} onClick={() => eliminar(it.id)}>🗑️ Eliminar</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
        {pendientes.length > 0 && selected.size === 0 && (
                <div className="status-line">
                  <button className="claim-btn" onClick={selectAllPendientes}>
                    Seleccionar todos los pendientes
                  </button>
                </div>
              )}

              {selected.size > 0 && !claiming && (
                <div className="status-line">
                  <span className="status-chip pendiente">
                    {selected.size} seleccionado{selected.size === 1 ? '' : 's'}
                  </span>
                  <button className="undo-btn" onClick={() => setSelected(new Set())}>Limpiar selección</button>
                </div>
              )}
    </div>
  )
}