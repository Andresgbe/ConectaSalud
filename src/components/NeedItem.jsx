import { useState } from 'react'
import { supabase } from '../supabaseClient.js'

const URGENCIA_LABEL = {
  urgente: '🆘 Urgente: no queda',
  alta: '🔴 Alta',
  mediana: '🟡 Mediana',
  baja: '🟢 Baja',
}
const STATUS_LABEL = {
  pendiente: 'Pendiente',
  lista_para_salir: 'Lista para salir',
  enviada: 'En camino',
  recibida: 'Recibida',
}
const SIGUIENTE_LABEL = {
  pendiente: 'Marcar lista para salir',
  lista_para_salir: 'Marcar en camino',
  enviada: 'Confirmar recibida',
}

function horaYrelativo(iso) {
  const fecha = new Date(iso)
  const hora = fecha.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' })
  const mins = Math.floor((Date.now() - fecha.getTime()) / 60000)
  const rel = mins < 1 ? 'hace un momento' : mins < 60 ? `hace ${mins} min` : `hace ${Math.floor(mins / 60)} h`
  return `a las ${hora} · ${rel}`
}

export default function NeedItem({ item, onChanged, isAdmin, adminCreds, acopioCreds, medicoCreds, fundacionCreds, masterCreds }) {
  const [busy, setBusy] = useState(false)
  const [notaAbierta, setNotaAbierta] = useState(false)
  const [nota, setNota] = useState('')
  const esMiHospital = medicoCreds?.hospital === item.hospital
  const puedeCambiar = !!acopioCreds || !!fundacionCreds || !!masterCreds || (medicoCreds && esMiHospital)
  const esUltimoPaso = item.estado_cobertura === 'enviada'

  async function avanzar() {
    setBusy(true)
    const p_nota = esUltimoPaso ? nota.trim() : ''
    if (masterCreds) {
      await supabase.rpc('avanzar_estado_master', { p_id: item.id, p_master_telefono: masterCreds.telefono })
    } else if (acopioCreds) {
      await supabase.rpc('avanzar_estado_acopio', { p_id: item.id, p_telefono: acopioCreds.telefono, p_codigo: acopioCreds.codigo, p_nota })
    } else if (fundacionCreds) {
      await supabase.rpc('avanzar_estado_fundacion', { p_id: item.id, p_telefono: fundacionCreds.telefono, p_nota })
    } else if (medicoCreds) {
      await supabase.rpc('avanzar_estado_medico', { p_id: item.id, p_telefono: medicoCreds.telefono, p_nota })
    }
    setBusy(false)
    onChanged?.()
  }

  async function retroceder() {
    setBusy(true)
    if (masterCreds) {
      await supabase.rpc('retroceder_estado_master', { p_id: item.id, p_master_telefono: masterCreds.telefono })
    } else if (acopioCreds) {
      await supabase.rpc('retroceder_estado_acopio', { p_id: item.id, p_telefono: acopioCreds.telefono, p_codigo: acopioCreds.codigo })
    } else if (fundacionCreds) {
      await supabase.rpc('retroceder_estado_fundacion', { p_id: item.id, p_telefono: fundacionCreds.telefono })
    } else if (medicoCreds) {
      await supabase.rpc('retroceder_estado_medico', { p_id: item.id, p_telefono: medicoCreds.telefono })
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
    await supabase.rpc('eliminar_necesidad_medico', { p_id: item.id, p_telefono: medicoCreds.telefono })
    setBusy(false)
    onChanged?.()
  }

  async function eliminarFundacion() {
    if (!confirm('¿Eliminar este insumo permanentemente?')) return
    setBusy(true)
    await supabase.rpc('eliminar_necesidad_fundacion', { p_id: item.id, p_telefono: fundacionCreds.telefono })
    setBusy(false)
    onChanged?.()
  }

  async function eliminarMaster() {
    if (!confirm('¿Eliminar este insumo permanentemente?')) return
    setBusy(true)
    await supabase.rpc('master_eliminar_necesidad', { p_id: item.id, p_master_telefono: masterCreds.telefono })
    setBusy(false)
    onChanged?.()
  }

  const puedeEliminar = isAdmin || !!masterCreds || esMiHospital || (fundacionCreds && item.contacto === fundacionCreds.telefono)

  return (
    <div className={`need-card u-${item.urgencia}`}>
      <div className="need-top">
        <span className="item-hospital">{item.hospital}</span>
        <span className={`item-status ${item.estado_cobertura}`}>{STATUS_LABEL[item.estado_cobertura]}</span>
      </div>

      <div className="item-line">
        <b>{item.insumo}</b>{item.cantidad ? ` — ${item.cantidad}` : ''}
        <span className={`tag-mini u-${item.urgencia}`}>{URGENCIA_LABEL[item.urgencia]}</span>
      </div>

      {item.notas && <div className="need-notas">{item.notas}</div>}

      <div className="item-sub">
        {horaYrelativo(item.creado_en)}
        {item.servicio && <> · {item.servicio}</>}
        {item.contacto && <> · 📞 {item.contacto}</>}
        {item.creado_por && <> · {item.creado_por}</>}
        {item.estado_cobertura !== 'pendiente' && item.cubierto_por && <> · {item.cubierto_por}</>}
        {puedeEliminar && (
          <>
            {' · '}
            <button className="mini-link" style={{ color: 'var(--rojo)' }} disabled={busy} onClick={() => (isAdmin || masterCreds ? (masterCreds ? eliminarMaster() : eliminar()) : esMiHospital ? eliminarPropio() : eliminarFundacion())}>🗑️ Eliminar</button>
          </>
        )}
      </div>

      {puedeCambiar && (
        <div className="status-line">
          {item.estado_cobertura !== 'recibida' && (
            <button className="claim-btn" disabled={busy} onClick={avanzar}>{SIGUIENTE_LABEL[item.estado_cobertura]}</button>
          )}
          {item.estado_cobertura !== 'pendiente' && (
            <button className="undo-btn" disabled={busy} onClick={retroceder}>Deshacer</button>
          )}
          {item.nota_recepcion && (
            <span className="nota-chip">📝 {item.nota_recepcion}</span>
          )}
          {esUltimoPaso && (
            notaAbierta ? (
              <input
                type="text"
                className="nota-recepcion-input"
                placeholder="Nota opcional…"
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                autoFocus
              />
            ) : (
              <button type="button" className="mini-link" onClick={() => setNotaAbierta(true)}>Dejar una nota</button>
            )
          )}
        </div>
      )}
    </div>
  )
}