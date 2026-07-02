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
  en_proceso: 'En proceso',
  lista_para_salir: 'Lista para salir',
  enviada: 'En camino',
  recibida: 'Recibida',
}
const SIGUIENTE_LABEL = {
  pendiente: 'Marcar en proceso',
  en_proceso: 'Marcar lista para salir',
  lista_para_salir: 'Marcar en camino',
  enviada: 'Confirmar recibida',
}

// Centros operativos conocidos (master/subadmin). El slug evita acentos en la clase CSS.
export const CENTROS = ['Anatómico', 'Tropical']
const CENTRO_SLUG = { 'Anatómico': 'anatomico', 'Tropical': 'tropical' }

// Centro asociado a una necesidad: el de origen (quién la reportó, dato estructurado),
// o el que la gestiona; como último recurso, el "(Centro)" embebido en el texto.
export function centroDeItem(item) {
  if (item?.creado_por_centro) return item.creado_por_centro
  if (item?.cubierto_por_centro) return item.cubierto_por_centro
  const txt = `${item?.creado_por || ''} ${item?.cubierto_por || ''}`
  return CENTROS.find((c) => txt.includes(`(${c})`)) || null
}

export function CentroChip({ centro }) {
  if (!centro) return null
  const slug = CENTRO_SLUG[centro] || 'otro'
  return <span className={`centro-chip centro-${slug}`}>🏥 {centro}</span>
}

export function horaYrelativo(iso) {
  const fecha = new Date(iso)
  const hora = fecha.toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' })
  const mins = Math.floor((Date.now() - fecha.getTime()) / 60000)
  const rel = mins < 1 ? 'hace un momento' : mins < 60 ? `hace ${mins} min` : `hace ${Math.floor(mins / 60)} h`
  return `a las ${hora} · ${rel}`
}

// Datos de contacto compartidos por toda una solicitud (mismo lote).
// Se muestra una sola vez: en la tarjeta individual o arriba del grupo.
// `verCreador` (solo admin/master/subadmin) revela los datos de quien reportó/colaboró;
// para el resto se ocultan por privacidad (el chip de centro sí se ve para todos).
export function ItemInfoBlock({ item, verCreador = false }) {
  // El reportante suele ser la misma persona que recibe; solo lo mostramos
  // si aporta un dato distinto al que ya se ve en "Recibe" (evita duplicarlo).
  const reportante = []
  if (verCreador && item.creado_por && item.creado_por !== item.receptor_nombre) reportante.push(item.creado_por)
  if (verCreador && item.contacto && item.contacto !== item.receptor_telefono) reportante.push(item.contacto)

  return (
    <div className="item-sub item-sub-vertical">
      <div>{horaYrelativo(item.creado_en)}</div>
      {item.ubicacion_espontanea && <div><b>CENTRO:</b> {item.ubicacion_espontanea}</div>}
      {item.servicio && <div><b>SERVICIO:</b> {item.servicio}</div>}
      {(item.receptor_nombre || item.receptor_telefono || item.receptor_telefono_2) && (
        <div>
          {item.receptor_nombre && <><b>🧑 Recibe:</b> {item.receptor_nombre}{(item.receptor_telefono || item.receptor_telefono_2) && ' · '}</>}
          {item.receptor_telefono && <><b>📞</b> {item.receptor_telefono}</>}
          {item.receptor_telefono_2 && <> · <b>Contacto 2:</b> {item.receptor_telefono_2}</>}
        </div>
      )}
      {reportante.length > 0 && <div><b>Reportado por:</b> {reportante.join(' · ')}</div>}
      {item.estado_cobertura !== 'pendiente' && item.cubierto_por && <div>{item.cubierto_por}</div>}
      {item.transportista_nombre && (
        <div><b>🚚 Quien transporta:</b> {item.transportista_nombre} ({item.transportista_telefono})</div>
      )}
      {item.notas && <div className="need-notas">{item.notas}</div>}
    </div>
  )
}

export default function NeedItem({ item, onChanged, isAdmin, adminCreds, acopioCreds, medicoCreds, fundacionCreds, masterCreds, subadminCreds, compact, groupControlled, selectable, checked, onToggleCheck, centrosActivos = [] }) {
  const [busy, setBusy] = useState(false)
  const [notaAbierta, setNotaAbierta] = useState(false)
  const [nota, setNota] = useState('')
  const [transAbierto, setTransAbierto] = useState(false)
  const [transNombre, setTransNombre] = useState('')
  const [transTel, setTransTel] = useState('')

  const esMiHospital = medicoCreds?.hospital === item.hospital
  // Centro del operador logueado (solo master/subadmin llevan centro).
  const miCentro = masterCreds?.nombre_centro || subadminCreds?.nombre_centro || null
  const esOperador = !!masterCreds || !!subadminCreds
  const rech = item.rechazado_por_centros || []
  const yoRechace = !!miCentro && rech.includes(miCentro)
  // Exclusividad: si otro centro ya la está gestionando, no la puedo tocar.
  const gestionadaPorOtro = esOperador && !!item.cubierto_por_centro && !!miCentro && item.cubierto_por_centro !== miCentro
  const faltantes = centrosActivos.filter((c) => !rech.includes(c))

  const puedeCambiar = (!!acopioCreds || !!fundacionCreds || !!masterCreds || !!subadminCreds || (medicoCreds && esMiHospital)) && !gestionadaPorOtro
  const esUltimoPaso = item.estado_cobertura === 'enviada'
  const vaACamino = item.estado_cobertura === 'lista_para_salir'
  const noDisponible = item.incluido === false
  const esPendiente = item.estado_cobertura === 'pendiente'

  async function avanzar() {
    if (vaACamino) {
      if (!transNombre.trim() || transTel.trim().length < 7) {
        alert('Indica el nombre y teléfono (mínimo 7 dígitos) de quien lo va a llevar.')
        return
      }
    }
    setBusy(true)
    const p_nota = esUltimoPaso ? nota.trim() : ''
    const tn = vaACamino ? transNombre.trim() : null
    const tt = vaACamino ? transTel.trim() : null

    if (masterCreds) {
      await supabase.rpc('avanzar_estado_master', { p_id: item.id, p_master_telefono: masterCreds.telefono, p_nota, p_trans_nombre: tn, p_trans_telefono: tt })
    } else if (subadminCreds) {
      await supabase.rpc('avanzar_estado_subadmin', { p_id: item.id, p_telefono: subadminCreds.telefono, p_nota, p_trans_nombre: tn, p_trans_telefono: tt })
    } else if (acopioCreds) {
      await supabase.rpc('avanzar_estado_acopio', { p_id: item.id, p_telefono: acopioCreds.telefono, p_codigo: acopioCreds.codigo, p_nota, p_trans_nombre: tn, p_trans_telefono: tt })
    } else if (fundacionCreds) {
      await supabase.rpc('avanzar_estado_fundacion', { p_id: item.id, p_telefono: fundacionCreds.telefono, p_nota, p_trans_nombre: tn, p_trans_telefono: tt })
    } else if (medicoCreds) {
      await supabase.rpc('avanzar_estado_medico', { p_id: item.id, p_telefono: medicoCreds.telefono, p_nota, p_trans_nombre: tn, p_trans_telefono: tt })
    }
    setBusy(false)
    setTransAbierto(false); setTransNombre(''); setTransTel('')
    onChanged?.()
  }

  async function retroceder() {
    setBusy(true)
    if (masterCreds) {
      await supabase.rpc('retroceder_estado_master', { p_id: item.id, p_master_telefono: masterCreds.telefono })
    } else if (subadminCreds) {
      await supabase.rpc('retroceder_estado_subadmin', { p_id: item.id, p_telefono: subadminCreds.telefono })
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

  async function marcarNoDisponible() {
    setBusy(true)
    if (masterCreds) {
      await supabase.rpc('marcar_no_disponible_master', { p_id: item.id, p_master_telefono: masterCreds.telefono })
    } else if (subadminCreds) {
      await supabase.rpc('marcar_no_disponible_subadmin', { p_id: item.id, p_telefono: subadminCreds.telefono })
    } else if (acopioCreds) {
      await supabase.rpc('marcar_no_disponible_acopio', { p_id: item.id, p_telefono: acopioCreds.telefono, p_codigo: acopioCreds.codigo })
    } else if (fundacionCreds) {
      await supabase.rpc('marcar_no_disponible_fundacion', { p_id: item.id, p_telefono: fundacionCreds.telefono })
    } else if (medicoCreds) {
      await supabase.rpc('marcar_no_disponible_medico', { p_id: item.id, p_telefono: medicoCreds.telefono })
    }
    setBusy(false)
    onChanged?.()
  }

  async function reactivar() {
    setBusy(true)
    if (masterCreds) {
      await supabase.rpc('reactivar_insumo_master', { p_id: item.id, p_master_telefono: masterCreds.telefono })
    } else if (subadminCreds) {
      await supabase.rpc('reactivar_insumo_subadmin', { p_id: item.id, p_telefono: subadminCreds.telefono })
    } else if (acopioCreds) {
      await supabase.rpc('reactivar_insumo_acopio', { p_id: item.id, p_telefono: acopioCreds.telefono, p_codigo: acopioCreds.codigo })
    } else if (fundacionCreds) {
      await supabase.rpc('reactivar_insumo_fundacion', { p_id: item.id, p_telefono: fundacionCreds.telefono })
    } else if (medicoCreds) {
      await supabase.rpc('reactivar_insumo_medico', { p_id: item.id, p_telefono: medicoCreds.telefono })
    }
    setBusy(false)
    onChanged?.()
  }

  async function eliminar() {
    if (!confirm('¿Eliminar este insumo permanentemente?')) return
    setBusy(true)
    await supabase.rpc('admin_eliminar_necesidad', { p_admin_id: adminCreds.identificador, p_admin_codigo: adminCreds.codigo, p_id: item.id })
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

  async function toggleDeshabilitada() {
    setBusy(true)
    if (masterCreds) {
      await supabase.rpc('master_toggle_deshabilitada', { p_id: item.id, p_master_telefono: masterCreds.telefono, p_deshabilitada: !item.deshabilitada })
    } else if (subadminCreds) {
      await supabase.rpc('subadmin_toggle_deshabilitada', { p_id: item.id, p_telefono: subadminCreds.telefono, p_deshabilitada: !item.deshabilitada })
    }
    setBusy(false)
    onChanged?.()
  }

  const puedeDeshabilitar = !!masterCreds || !!subadminCreds
  const puedeEliminar = isAdmin || !!masterCreds || esMiHospital || (fundacionCreds && item.contacto === fundacionCreds.telefono)

  const accionesBlock = puedeCambiar && (
    noDisponible ? (
      <div className="status-line">
        <span className="item-sub">Marcado como no disponible.</span>
        <button className="undo-btn" disabled={busy} onClick={reactivar}>Reactivar</button>
      </div>
    ) : yoRechace ? (
      <div className="status-line">
        <span className="item-sub">Marcaste "No disponible" para {miCentro}.</span>
        <button className="undo-btn" disabled={busy} onClick={reactivar}>Reactivar</button>
      </div>
    ) : (
    <div className="status-line">
      {item.estado_cobertura !== 'recibida' && !vaACamino && (
        <button className="claim-btn" disabled={busy} onClick={avanzar}>{SIGUIENTE_LABEL[item.estado_cobertura]}</button>
      )}

      {(esPendiente || item.estado_cobertura === 'en_proceso') && (
        <button className="undo-btn" disabled={busy} onClick={marcarNoDisponible}>No disponible</button>
      )}

      {vaACamino && !transAbierto && (
        <button className="claim-btn" disabled={busy} onClick={() => setTransAbierto(true)}>{SIGUIENTE_LABEL[item.estado_cobertura]}</button>
      )}
      {vaACamino && transAbierto && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, width: '100%' }}>
          <input type="text" className="nota-recepcion-input" placeholder="Nombre de quien lo lleva" value={transNombre} onChange={(e) => setTransNombre(e.target.value)} autoFocus />
          <input type="text" inputMode="numeric" className="nota-recepcion-input" placeholder="Teléfono" value={transTel} onChange={(e) => setTransTel(e.target.value.replace(/\D/g, '').slice(0, 11))} />
          <button className="claim-btn" disabled={busy} onClick={avanzar}>Confirmar en camino</button>
          <button className="undo-btn" disabled={busy} onClick={() => setTransAbierto(false)}>Cancelar</button>
        </div>
      )}

      {item.estado_cobertura !== 'pendiente' && (
        <button className="undo-btn" disabled={busy} onClick={retroceder}>Deshacer</button>
      )}
      {item.nota_recepcion && (
        <span className="nota-chip">📝 {item.nota_recepcion}</span>
      )}
      {esUltimoPaso && (
        notaAbierta ? (
          <input type="text" className="nota-recepcion-input" placeholder="Nota opcional…" value={nota} onChange={(e) => setNota(e.target.value)} autoFocus />
        ) : (
          <button type="button" className="mini-link" onClick={() => setNotaAbierta(true)}>Dejar una nota</button>
        )
      )}
    </div>
    )
  )

  // Rechazada por algún centro pero todavía viva: se informa a los demás.
  const rechazoBlock = !noDisponible && rech.length > 0 && !yoRechace && (
    <div className="item-sub no-disponible-por">
      🕓 No disponible para {rech.join(', ')}
      {faltantes.length > 0 && <> · en espera por <b>{faltantes.join(', ')}</b></>}
    </div>
  )

  const deshabilitarBtn = puedeDeshabilitar && (
    <button
      type="button"
      className="mini-link"
      style={{ color: item.deshabilitada ? 'var(--verde)' : 'var(--rojo)', fontSize: '.75rem' }}
      disabled={busy}
      onClick={toggleDeshabilitada}
    > 
      {item.deshabilitada ? 'Rehabilitar' : 'Deshabilitar'}
    </button>
  )

  // En grupos la info de contacto se muestra una sola vez, arriba del grupo,
  // así que aquí la omitimos para no duplicarla.
  // Solo admin/master/subadmin ven los datos de quien reportó/colaboró (privacidad).
  const verCreador = !!adminCreds || !!masterCreds || !!subadminCreds
  const infoBlock = groupControlled ? null : <ItemInfoBlock item={item} verCreador={verCreador} />

  if (compact) {
    const noDisponible = item.incluido === false
    return (
      <div className={`lote-item estado-bg-${noDisponible ? 'no_disponible' : item.estado_cobertura}`}>
        <div className="item-line">
          {selectable && (
            <input
              type="checkbox"
              className="item-checkbox"
              checked={!!checked}
              onChange={() => onToggleCheck?.(item.id)}
              aria-label={`Incluir ${item.insumo}`}
            />
          )}
          <b>{item.insumo}</b>{item.cantidad ? ` — ${item.cantidad}` : ''}
          <span className={`tag-mini u-${item.urgencia}`}>{URGENCIA_LABEL[item.urgencia]}</span>
          <span className={`item-status ${noDisponible ? 'no_disponible' : item.estado_cobertura}`} style={{ marginLeft: 'auto' }}>
            {noDisponible ? 'No disponible' : STATUS_LABEL[item.estado_cobertura]}
          </span>
          {deshabilitarBtn}
        </div>

        {noDisponible && item.no_disponible_por && (
          <div className="item-sub no-disponible-por">🚫 Marcado no disponible por {item.no_disponible_por}</div>
        )}
        {rechazoBlock}

        {infoBlock}

        {groupControlled
          ? (puedeCambiar && item.nota_recepcion && <span className="nota-chip">📝 {item.nota_recepcion}</span>)
          : accionesBlock}
      </div>
    )
  }

  return (
    <div className={`need-card estado-bg-${noDisponible ? 'no_disponible' : item.estado_cobertura}`}>
      <div className="need-top">
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span className="item-hospital">{item.hospital}</span>
          <CentroChip centro={centroDeItem(item)} />
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={`item-status ${noDisponible ? 'no_disponible' : item.estado_cobertura}`}>{noDisponible ? 'No disponible' : STATUS_LABEL[item.estado_cobertura]}</span>
          {deshabilitarBtn}
        </span>
      </div>

      <div className="item-line">
        <b>{item.insumo}</b>{item.cantidad ? ` — ${item.cantidad}` : ''}
        <span className={`tag-mini u-${item.urgencia}`}>{URGENCIA_LABEL[item.urgencia]}</span>
      </div>

      {noDisponible && item.no_disponible_por && (
        <div className="item-sub no-disponible-por">🚫 Marcado no disponible por {item.no_disponible_por}</div>
      )}
      {rechazoBlock}

      {infoBlock}

      {accionesBlock}
    </div>
  )
}