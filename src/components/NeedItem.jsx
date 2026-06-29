import { useState } from 'react'
import { supabase } from '../supabaseClient.js'

const URGENCIA_LABEL = {
  urgente: '🆘 Urgente: no queda',
  alta: '🔴 Alta',
  mediana: '🟡 Mediana',
  baja: '🟢 Baja',
}
const STATUS_LABEL = { pendiente: 'Pendiente', entregado: 'Entregado' }

function horaYrelativo(iso) {
  const fecha = new Date(iso)
  const hora = fecha.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' })
  const mins = Math.floor((Date.now() - fecha.getTime()) / 60000)
  const rel = mins < 1 ? 'hace un momento' : mins < 60 ? `hace ${mins} min` : `hace ${Math.floor(mins / 60)} h`
  return `a las ${hora} · ${rel}`
}

export default function NeedItem({ item, onChanged, isAdmin, adminCreds, acopioCreds, medicoCreds, fundacionCreds, puedeMarcar, selected, onToggle, disabled }) {
  const [busy, setBusy] = useState(false)
  const esMiHospital = medicoCreds?.hospital === item.hospital

  async function undo() {
    setBusy(true)
    if (acopioCreds) {
      await supabase.rpc('deshacer_necesidad', {
        p_id: item.id,
        p_telefono: acopioCreds.telefono,
        p_codigo: acopioCreds.codigo,
      })
    } else {
      await supabase.rpc('deshacer_necesidad_fundacion', {
        p_id: item.id,
        p_telefono: fundacionCreds.telefono,
      })
    }
    setBusy(false)
    onChanged?.()
  }

  async function eliminar() {
    if (!confirm('¿Eliminar este insumo permanentemente?')) return
    setBusy(true)
    await supabase.rpc('admin_eliminar_necesidad', {
      p_admin_id: adminCreds.identificador,
      p_admin_codigo: adminCreds.codigo,
      p_id: item.id,
    })
    setBusy(false)
    onChanged?.()
  }

  async function eliminarPropio() {
    if (!confirm('¿Eliminar este insumo permanentemente?')) return
    setBusy(true)
    await supabase.rpc('eliminar_necesidad_medico', {
      p_id: item.id,
      p_telefono: medicoCreds.telefono,
    })
    setBusy(false)
    onChanged?.()
  }

  async function eliminarFundacion() {
    if (!confirm('¿Eliminar este insumo permanentemente?')) return
    setBusy(true)
    await supabase.rpc('eliminar_necesidad_fundacion', {
      p_id: item.id,
      p_telefono: fundacionCreds.telefono,
    })
    setBusy(false)
    onChanged?.()
  }

  const puedeEliminar = isAdmin || esMiHospital || (fundacionCreds && item.contacto === fundacionCreds.telefono)

  return (
    <div className={`need-card u-${item.urgencia}`}>
      <div className="need-top">
        <span className="item-hospital">{item.hospital}</span>
        <span className={`item-status ${item.estado_cobertura}`}>{STATUS_LABEL[item.estado_cobertura]}</span>
      </div>

      <div className="item-line">
        {item.estado_cobertura === 'pendiente' && puedeMarcar && (
          <input
            type="checkbox" className="item-checkbox"
            checked={selected} disabled={disabled}
            onChange={() => onToggle(item.id)}
          />
        )}
        {item.estado_cobertura === 'entregado' && <span className="item-checkbox-placeholder">✅</span>}
        <b>{item.insumo}</b>{item.cantidad ? ` — ${item.cantidad}` : ''}
        <span className={`tag-mini u-${item.urgencia}`}>{URGENCIA_LABEL[item.urgencia]}</span>
      </div>

      {item.notas && <div className="need-notas">{item.notas}</div>}

      <div className="item-sub">
        {horaYrelativo(item.creado_en)}
        {item.servicio && <> · {item.servicio}</>}
        {item.contacto && <> · 📞 {item.contacto}</>}
        {item.creado_por && <> · {item.creado_por}</>}
        {item.estado_cobertura === 'entregado' && (
          <>
            {' · '}
            <span className="status-chip entregado">
              {STATUS_LABEL.entregado}{item.cubierto_por ? ` · ${item.cubierto_por}` : ''}
            </span>
            {puedeMarcar && (
              <>
                {' · '}
                <button className="mini-link" disabled={busy} onClick={undo}>Deshacer</button>
              </>
            )}
          </>
        )}
        {puedeEliminar && (
          <>
            {' · '}
            <button className="mini-link" style={{ color: 'var(--rojo)' }} disabled={busy} onClick={() => (isAdmin ? eliminar() : esMiHospital ? eliminarPropio() : eliminarFundacion())}>🗑️ Eliminar</button>
          </>
        )}
      </div>
    </div>
  )
}