import { useState } from 'react'
import { supabase } from '../supabaseClient.js'
import NeedItem from './NeedItem.jsx'

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
const ORDEN_URGENCIA = { urgente: 0, alta: 1, mediana: 2, baja: 3 }

export default function NeedRequestGroup({ items, onChanged, isAdmin, adminCreds, acopioCreds, medicoCreds, fundacionCreds, masterCreds, subadminCreds }) {
  const [collapsed, setCollapsed] = useState(false)
  const [checkedIds, setCheckedIds] = useState(() => new Set())
  const [busy, setBusy] = useState(false)
  const [transAbierto, setTransAbierto] = useState(false)
  const [transNombre, setTransNombre] = useState('')
  const [transTel, setTransTel] = useState('')
  const [notaAbierta, setNotaAbierta] = useState(false)
  const [nota, setNota] = useState('')

  const hospital = items[0].hospital
  const incluidos = items.filter((it) => it.incluido !== false)
  const excluidos = items.filter((it) => it.incluido === false)
  const pendientesSinResolver = items.filter((it) => it.estado_cobertura === 'pendiente' && it.incluido !== false)
  const estadoGrupo = incluidos[0]?.estado_cobertura || 'pendiente'
  const vaACamino = estadoGrupo === 'lista_para_salir'
  const esUltimoPaso = estadoGrupo === 'enviada'

  const puedeCambiar = !!acopioCreds || !!fundacionCreds || !!masterCreds || !!subadminCreds || (medicoCreds && medicoCreds.hospital === hospital)

  const urgenciaTop = items.reduce(
    (top, it) => (ORDEN_URGENCIA[it.urgencia] < ORDEN_URGENCIA[top] ? it.urgencia : top),
    items[0].urgencia
  )

  function metaTexto() {
    if (pendientesSinResolver.length > 0) {
      return `${items.length} insumo${items.length === 1 ? '' : 's'} · ${pendientesSinResolver.length} pendiente${pendientesSinResolver.length === 1 ? '' : 's'}`
    }
    const partes = []
    if (incluidos.length > 0) {
      partes.push(`${incluidos.length} insumo${incluidos.length === 1 ? '' : 's'} incluido${incluidos.length === 1 ? '' : 's'}`)
      partes.push(STATUS_LABEL[estadoGrupo])
    }
    if (excluidos.length > 0) {
      partes.push(`${excluidos.length} no disponible${excluidos.length === 1 ? '' : 's'}`)
    }
    return partes.join(' · ')
  }

  function toggleCheck(id) {
    setCheckedIds((set) => {
      const next = new Set(set)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function marcarTodos() {
    setCheckedIds(new Set(pendientesSinResolver.map((it) => it.id)))
  }

  async function llamarAvanzar(item, extra = {}) {
    const p_nota = extra.p_nota ?? ''
    const p_trans_nombre = extra.p_trans_nombre ?? null
    const p_trans_telefono = extra.p_trans_telefono ?? null
    if (masterCreds) {
      return supabase.rpc('avanzar_estado_master', { p_id: item.id, p_master_telefono: masterCreds.telefono, p_nota, p_trans_nombre, p_trans_telefono })
    }
    if (subadminCreds) {
      return supabase.rpc('avanzar_estado_subadmin', { p_id: item.id, p_telefono: subadminCreds.telefono, p_nota, p_trans_nombre, p_trans_telefono })
    }
    if (acopioCreds) {
      return supabase.rpc('avanzar_estado_acopio', { p_id: item.id, p_telefono: acopioCreds.telefono, p_codigo: acopioCreds.codigo, p_nota, p_trans_nombre, p_trans_telefono })
    }
    if (fundacionCreds) {
      return supabase.rpc('avanzar_estado_fundacion', { p_id: item.id, p_telefono: fundacionCreds.telefono, p_nota, p_trans_nombre, p_trans_telefono })
    }
    if (medicoCreds) {
      return supabase.rpc('avanzar_estado_medico', { p_id: item.id, p_telefono: medicoCreds.telefono, p_nota, p_trans_nombre, p_trans_telefono })
    }
  }

  async function llamarNoDisponible(item) {
    if (masterCreds) return supabase.rpc('marcar_no_disponible_master', { p_id: item.id, p_master_telefono: masterCreds.telefono })
    if (subadminCreds) return supabase.rpc('marcar_no_disponible_subadmin', { p_id: item.id, p_telefono: subadminCreds.telefono })
    if (acopioCreds) return supabase.rpc('marcar_no_disponible_acopio', { p_id: item.id, p_telefono: acopioCreds.telefono, p_codigo: acopioCreds.codigo })
    if (fundacionCreds) return supabase.rpc('marcar_no_disponible_fundacion', { p_id: item.id, p_telefono: fundacionCreds.telefono })
    if (medicoCreds) return supabase.rpc('marcar_no_disponible_medico', { p_id: item.id, p_telefono: medicoCreds.telefono })
  }

  async function llamarReactivar(item) {
    if (masterCreds) return supabase.rpc('reactivar_insumo_master', { p_id: item.id, p_master_telefono: masterCreds.telefono })
    if (subadminCreds) return supabase.rpc('reactivar_insumo_subadmin', { p_id: item.id, p_telefono: subadminCreds.telefono })
    if (acopioCreds) return supabase.rpc('reactivar_insumo_acopio', { p_id: item.id, p_telefono: acopioCreds.telefono, p_codigo: acopioCreds.codigo })
    if (fundacionCreds) return supabase.rpc('reactivar_insumo_fundacion', { p_id: item.id, p_telefono: fundacionCreds.telefono })
    if (medicoCreds) return supabase.rpc('reactivar_insumo_medico', { p_id: item.id, p_telefono: medicoCreds.telefono })
  }

  async function llamarRetroceder(item) {
    if (masterCreds) return supabase.rpc('retroceder_estado_master', { p_id: item.id, p_master_telefono: masterCreds.telefono })
    if (subadminCreds) return supabase.rpc('retroceder_estado_subadmin', { p_id: item.id, p_telefono: subadminCreds.telefono })
    if (acopioCreds) return supabase.rpc('retroceder_estado_acopio', { p_id: item.id, p_telefono: acopioCreds.telefono, p_codigo: acopioCreds.codigo })
    if (fundacionCreds) return supabase.rpc('retroceder_estado_fundacion', { p_id: item.id, p_telefono: fundacionCreds.telefono })
    if (medicoCreds) return supabase.rpc('retroceder_estado_medico', { p_id: item.id, p_telefono: medicoCreds.telefono })
  }

  async function confirmarPendienteInicial() {
    setBusy(true)
    for (const item of pendientesSinResolver) {
      if (checkedIds.has(item.id)) {
        await llamarAvanzar(item)
      } else {
        await llamarNoDisponible(item)
      }
    }
    setBusy(false)
    setCheckedIds(new Set())
    onChanged?.()
  }

  async function avanzarGrupo() {
    if (vaACamino) {
      if (!transNombre.trim() || transTel.trim().length < 7) {
        alert('Indica el nombre y teléfono (mínimo 7 dígitos) de quien lo va a llevar.')
        return
      }
    }
    setBusy(true)
    const p_nota = esUltimoPaso ? nota.trim() : ''
    const p_trans_nombre = vaACamino ? transNombre.trim() : null
    const p_trans_telefono = vaACamino ? transTel.trim() : null
    for (const item of incluidos) {
      await llamarAvanzar(item, { p_nota, p_trans_nombre, p_trans_telefono })
    }
    setBusy(false)
    setTransAbierto(false); setTransNombre(''); setTransTel('')
    setNotaAbierta(false); setNota('')
    onChanged?.()
  }

  async function deshacerGrupo() {
    setBusy(true)
    if (incluidos.length > 0 && estadoGrupo !== 'pendiente') {
      for (const item of incluidos) {
        await llamarRetroceder(item)
      }
    }
    if (excluidos.length > 0 && (incluidos.length === 0 || estadoGrupo === 'en_proceso')) {
      for (const item of excluidos) {
        await llamarReactivar(item)
      }
    }
    setBusy(false)
    onChanged?.()
  }

  return (
    <div className={`request-group u-${urgenciaTop}`}>
      <button type="button" className="request-group-header" onClick={() => setCollapsed((v) => !v)}>
        <div className="request-group-title">
          <h3>{hospital}</h3>
          <div className="request-group-meta">{metaTexto()}</div>
        </div>
        <span className="collapse-btn">{collapsed ? '+' : '−'}</span>
      </button>

      {!collapsed && (
        <div className="request-group-body">
          {items.map((item) => (
            <NeedItem
              key={item.id}
              item={item}
              compact
              groupControlled
              selectable={pendientesSinResolver.some((p) => p.id === item.id)}
              checked={checkedIds.has(item.id)}
              onToggleCheck={toggleCheck}
              onChanged={onChanged}
              isAdmin={isAdmin}
              adminCreds={adminCreds}
              acopioCreds={acopioCreds}
              medicoCreds={medicoCreds}
              fundacionCreds={fundacionCreds}
              masterCreds={masterCreds}
              subadminCreds={subadminCreds}
            />
          ))}

          {puedeCambiar && pendientesSinResolver.length > 0 && (
            <div className="request-group-status-line">
              <button type="button" className="marcar-todos-btn" disabled={busy} onClick={marcarTodos}>
                Marcar todos
              </button>
              <button type="button" className="claim-btn" disabled={busy} onClick={confirmarPendienteInicial}>
                Marcar en proceso
              </button>
            </div>
          )}

          {puedeCambiar && pendientesSinResolver.length === 0 && incluidos.length === 0 && excluidos.length > 0 && (
            <div className="request-group-status-line">
              <span className="item-sub">Ningún insumo fue marcado como incluido en este request.</span>
              <button className="undo-btn" disabled={busy} onClick={deshacerGrupo}>Deshacer</button>
            </div>
          )}

          {puedeCambiar && pendientesSinResolver.length === 0 && incluidos.length > 0 && (
            <div className="request-group-status-line">
              {estadoGrupo !== 'recibida' && !vaACamino && (
                <button className="claim-btn" disabled={busy} onClick={avanzarGrupo}>{SIGUIENTE_LABEL[estadoGrupo]}</button>
              )}
              {vaACamino && !transAbierto && (
                <button className="claim-btn" disabled={busy} onClick={() => setTransAbierto(true)}>{SIGUIENTE_LABEL[estadoGrupo]}</button>
              )}
              {vaACamino && transAbierto && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, width: '100%' }}>
                  <input type="text" className="nota-recepcion-input" placeholder="Nombre de quien lo lleva" value={transNombre} onChange={(e) => setTransNombre(e.target.value)} autoFocus />
                  <input type="text" inputMode="numeric" className="nota-recepcion-input" placeholder="Teléfono" value={transTel} onChange={(e) => setTransTel(e.target.value.replace(/\D/g, '').slice(0, 11))} />
                  <button className="claim-btn" disabled={busy} onClick={avanzarGrupo}>Confirmar en camino</button>
                  <button className="undo-btn" disabled={busy} onClick={() => setTransAbierto(false)}>Cancelar</button>
                </div>
              )}
              <button className="undo-btn" disabled={busy} onClick={deshacerGrupo}>Deshacer</button>
              {esUltimoPaso && (
                notaAbierta ? (
                  <input type="text" className="nota-recepcion-input" placeholder="Nota opcional…" value={nota} onChange={(e) => setNota(e.target.value)} autoFocus />
                ) : (
                  <button type="button" className="mini-link" onClick={() => setNotaAbierta(true)}>Dejar una nota</button>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}