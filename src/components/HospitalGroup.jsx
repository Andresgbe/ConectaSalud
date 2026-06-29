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

export default function HospitalGroup({ hospital, items, onChanged, isAdmin, adminCreds, acopioCreds, medicoCreds, fundacionCreds }) {
  const [selected, setSelected] = useState(new Set())
  const [busy, setBusy] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const puedeMarcar = !!acopioCreds || !!fundacionCreds
  const esMiHospital = medicoCreds?.hospital === hospital

  const pendientes = items.filter((i) => i.estado_cobertura === 'pendiente')
  const entregados = items
    .filter((i) => i.estado_cobertura === 'entregado')
    .sort((a, b) => new Date(b.actualizado_en) - new Date(a.actualizado_en))
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

  async function confirmarEntrega() {
    if (selected.size === 0) return
    if (!confirm(`¿Confirmas que vas a entregar ${selected.size} insumo${selected.size === 1 ? '' : 's'}?`)) return
    setBusy(true)
    if (acopioCreds) {
      await supabase.rpc('reclamar_varios', {
        p_ids: Array.from(selected),
        p_telefono: acopioCreds.telefono,
        p_codigo: acopioCreds.codigo,
      })
    } else {
      await supabase.rpc('reclamar_varios_fundacion', {
        p_ids: Array.from(selected),
        p_telefono: fundacionCreds.telefono,
      })
    }
    setBusy(false)
    setSelected(new Set())
    onChanged?.()
  }

  async function undo(id) {
    setBusy(true)
    if (acopioCreds) {
      await supabase.rpc('deshacer_necesidad', {
        p_id: id,
        p_telefono: acopioCreds.telefono,
        p_codigo: acopioCreds.codigo,
      })
    } else {
      await supabase.rpc('deshacer_necesidad_fundacion', {
        p_id: id,
        p_telefono: fundacionCreds.telefono,
      })
    }
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
  async function eliminarPropio(id) {
  if (!confirm('¿Eliminar este insumo permanentemente?')) return
  setBusy(true)
  await supabase.rpc('eliminar_necesidad_medico', {
    p_id: id,
    p_telefono: medicoCreds.telefono,
  })
  setBusy(false)
  onChanged?.()
}

  async function eliminarFundacion(id) {
  if (!confirm('¿Eliminar este insumo permanentemente?')) return
  setBusy(true)
  await supabase.rpc('eliminar_necesidad_fundacion', {
    p_id: id,
    p_telefono: fundacionCreds.telefono,
  })
  setBusy(false)
  onChanged?.()
}

  return (
    <div className={`need-card u-${topUrgencia}`}>
     <div className="need-top">
        <h3>{hospital}</h3>
        <button
          type="button"
          className="collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? `Expandir ${hospital}` : `Colapsar ${hospital}`}
        >
          {collapsed ? '+' : '−'}
        </button>
      </div>
      <div className="need-meta">
        {items.length} insumo{items.length === 1 ? '' : 's'} · {pendientes.length} pendiente{pendientes.length === 1 ? '' : 's'}
      </div>

      {!collapsed && (
      <>
      <div className="item-list">
        {ordenados.map((it) => (
          <div className={`item-row item-row-${it.estado_cobertura}`} key={it.id}>
            {it.estado_cobertura === 'pendiente' && puedeMarcar ? (
              <input
                type="checkbox" className="item-checkbox"
                checked={selected.has(it.id)}
                onChange={() => toggle(it.id)}
              />
            ) : (
              <span className="item-checkbox-placeholder">
                {it.estado_cobertura === 'entregado' ? '✅' : ''}
              </span>
            )}
            <div className="item-content">
              <div className="item-line">
                <b>{it.insumo}</b>{it.cantidad ? ` — ${it.cantidad}` : ''}
                <span className={`tag-mini u-${it.urgencia}`}>{URGENCIA_LABEL[it.urgencia]}</span>
                {it.estado_cobertura === 'pendiente' && puedeMarcar && selected.has(it.id) && (
                  <button className="claim-btn" style={{ marginLeft: 8 }} disabled={busy} onClick={confirmarEntrega}>
                    Marcar como entregado
                  </button>
                )}
              </div>
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
                    {puedeMarcar && (
                      <>
                        {' · '}
                        <button className="mini-link" disabled={busy} onClick={() => undo(it.id)}>Deshacer</button>
                      </>
                    )}
                  </>
                )}
                {(isAdmin || esMiHospital || (fundacionCreds && it.contacto === fundacionCreds.telefono)) && (
                    <>
                      {' · '}
                      <button className="mini-link" style={{ color: 'var(--rojo)' }} disabled={busy} onClick={() => (isAdmin ? eliminar(it.id) : esMiHospital ? eliminarPropio(it.id) : eliminarFundacion(it.id))}>🗑️ Eliminar</button>
                    </>
                  )}
              </div>
            </div>
            <span className={`item-status ${it.estado_cobertura}`}>
              {STATUS_LABEL[it.estado_cobertura]}
            </span>
          </div>
        ))}
      </div>

      {!puedeMarcar && pendientes.length > 0 && (
        <div className="status-line">
          <span className="item-sub">Inicia sesión como centro de acopio para marcar insumos como entregados.</span>
        </div>
      )}

      {puedeMarcar && pendientes.length > 0 && selected.size === 0 && (
        <div className="status-line">
          <button className="claim-btn" onClick={selectAllPendientes}>
            Seleccionar todos los pendientes
          </button>
        </div>
      )}

      {puedeMarcar && selected.size > 0 && (
        <div className="status-line">
          <span className="status-chip pendiente">
            {selected.size} seleccionado{selected.size === 1 ? '' : 's'}
          </span>
          <button className="undo-btn" onClick={() => setSelected(new Set())}>Limpiar selección</button>
        </div>
      )}
      </>
      )}
    </div>
  )
}