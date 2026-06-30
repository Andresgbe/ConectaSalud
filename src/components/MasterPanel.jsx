import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient.js'

const PREFIJOS = ['0412', '0414', '0416', '0424', '0426']

function Seccion({ titulo, icono, children }) {
  const [abierta, setAbierta] = useState(false)
  return (
    <div className="master-seccion">
      <button type="button" className="master-seccion-header" onClick={() => setAbierta(a => !a)}>
        <span>{icono} {titulo}</span>
        <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{abierta ? '−' : '+'}</span>
      </button>
      {abierta && <div className="master-seccion-body">{children}</div>}
    </div>
  )
}

export default function MasterPanel({ masterCreds }) {
  const tel = masterCreds.telefono

  const [hospitales, setHospitales] = useState([])
  const [acopios, setAcopios] = useState([])
  const [fundaciones, setFundaciones] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)

  const [editandoH, setEditandoH] = useState(null)
  const [formH, setFormH] = useState({ identificador: '', codigo_acceso: '' })
  const [nuevoH, setNuevoH] = useState({ nombre: '', identificador: '', codigo_acceso: '' })
  const [mostrarNuevoH, setMostrarNuevoH] = useState(false)
  const [msgH, setMsgH] = useState('')

  const [editandoA, setEditandoA] = useState(null)
  const [formA, setFormA] = useState({ codigo_acceso: '' })
  const [nuevoA, setNuevoA] = useState({ nombre_completo: '', prefijo: '0414', numero: '', nombre_centro: '', codigo_acceso: '' })
  const [mostrarNuevoA, setMostrarNuevoA] = useState(false)
  const [msgA, setMsgA] = useState('')

  const [editandoF, setEditandoF] = useState(null)
  const [formF, setFormF] = useState({ identificador: '', codigo_acceso: '' })
  const [nuevoF, setNuevoF] = useState({ nombre: '', identificador: '', codigo_acceso: '' })
  const [mostrarNuevoF, setMostrarNuevoF] = useState(false)
  const [msgF, setMsgF] = useState('')

  const [nuevoU, setNuevoU] = useState({ nombre: '', prefijo: '0414', numero: '', codigo: '' })
  const [mostrarNuevoU, setMostrarNuevoU] = useState(false)
  const [msgU, setMsgU] = useState('')

  async function cargar() {
    setLoading(true)
    const [{ data: hData }, { data: aData }, { data: fData }, { data: uData }] = await Promise.all([
      supabase.rpc('master_listar_hospitales', { p_master_telefono: tel }),
      supabase.rpc('master_listar_acopios', { p_master_telefono: tel }),
      supabase.rpc('master_listar_fundaciones', { p_master_telefono: tel }),
      supabase.rpc('master_listar_usuarios', { p_master_telefono: tel }),
    ])
    setHospitales(hData || [])
    setAcopios(aData || [])
    setFundaciones(fData || [])
    setUsuarios(uData || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  async function crearHospital() {
    if (!nuevoH.nombre.trim() || !nuevoH.codigo_acceso.trim()) { setMsgH('⚠️ Nombre y código son obligatorios.'); return }
    const { error } = await supabase.rpc('master_gestionar_hospital', {
      p_master_telefono: tel, p_accion: 'crear',
      p_nombre: nuevoH.nombre, p_identificador: nuevoH.identificador, p_codigo_acceso: nuevoH.codigo_acceso
    })
    if (error) { setMsgH('⚠️ ' + error.message); return }
    setNuevoH({ nombre: '', identificador: '', codigo_acceso: '' })
    setMostrarNuevoH(false); setMsgH(''); cargar()
  }

  async function guardarHospital(id) {
    const { error } = await supabase.rpc('master_gestionar_hospital', {
      p_master_telefono: tel, p_accion: 'editar_codigo',
      p_hospital_id: id, p_identificador: formH.identificador, p_codigo_acceso: formH.codigo_acceso
    })
    if (error) { setMsgH('⚠️ ' + error.message); return }
    setEditandoH(null); setMsgH(''); cargar()
  }

  async function toggleHospital(h) {
    await supabase.rpc('master_gestionar_hospital', {
      p_master_telefono: tel, p_accion: 'toggle_activo',
      p_hospital_id: h.id, p_activo: !h.activo
    })
    cargar()
  }

  async function crearAcopio() {
    if (nuevoA.numero.length !== 7) { setMsgA('⚠️ El número debe tener 7 dígitos.'); return }
    if (!nuevoA.nombre_completo.trim() || !nuevoA.nombre_centro.trim() || !nuevoA.codigo_acceso.trim()) {
      setMsgA('⚠️ Nombre, nombre del centro y código son obligatorios.'); return
    }
    const { data, error } = await supabase.rpc('master_crear_acopio', {
      p_master_telefono: tel,
      p_telefono: nuevoA.prefijo + nuevoA.numero,
      p_nombre_completo: nuevoA.nombre_completo.trim(),
      p_nombre_centro: nuevoA.nombre_centro.trim(),
      p_codigo_acceso: nuevoA.codigo_acceso.trim(),
    })
    if (error) { setMsgA('⚠️ ' + error.message); return }
    setNuevoA({ nombre_completo: '', prefijo: '0414', numero: '', nombre_centro: '', codigo_acceso: '' })
    setMostrarNuevoA(false); setMsgA(''); cargar()
  }

  async function eliminarAcopio(a) {
    if (!confirm(`¿Eliminar permanentemente "${a.nombre_centro}"? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.rpc('master_eliminar_acopio', { p_master_telefono: tel, p_acopio_id: a.id })
    if (error) { setMsgA('⚠️ ' + error.message); return }
    cargar()
  }

  async function guardarAcopio(id) {
    const { error } = await supabase.rpc('master_gestionar_acopio', {
      p_master_telefono: tel, p_accion: 'editar_codigo',
      p_acopio_id: id, p_codigo_acceso: formA.codigo_acceso
    })
    if (error) { setMsgA('⚠️ ' + error.message); return }
    setEditandoA(null); setMsgA(''); cargar()
  }

  async function toggleAcopio(a) {
    await supabase.rpc('master_gestionar_acopio', {
      p_master_telefono: tel, p_accion: 'toggle_activo',
      p_acopio_id: a.id, p_activo: !a.activo
    })
    cargar()
  }

  async function crearFundacion() {
    if (!nuevoF.nombre.trim() || !nuevoF.codigo_acceso.trim()) { setMsgF('⚠️ Nombre y código son obligatorios.'); return }
    const { error } = await supabase.rpc('master_gestionar_fundacion', {
      p_master_telefono: tel, p_accion: 'crear',
      p_nombre: nuevoF.nombre, p_identificador: nuevoF.identificador, p_codigo_acceso: nuevoF.codigo_acceso
    })
    if (error) { setMsgF('⚠️ ' + error.message); return }
    setNuevoF({ nombre: '', identificador: '', codigo_acceso: '' })
    setMostrarNuevoF(false); setMsgF(''); cargar()
  }

  async function guardarFundacion(id) {
    const { error } = await supabase.rpc('master_gestionar_fundacion', {
      p_master_telefono: tel, p_accion: 'editar_codigo',
      p_fundacion_id: id, p_identificador: formF.identificador, p_codigo_acceso: formF.codigo_acceso
    })
    if (error) { setMsgF('⚠️ ' + error.message); return }
    setEditandoF(null); cargar()
  }

  async function toggleFundacion(f) {
    await supabase.rpc('master_gestionar_fundacion', {
      p_master_telefono: tel, p_accion: 'toggle_activo',
      p_fundacion_id: f.id, p_activo: !f.activo
    })
    cargar()
  }

  async function crearUsuario() {
    if (nuevoU.numero.length !== 7) { setMsgU('⚠️ El número debe tener 7 dígitos.'); return }
    if (!nuevoU.nombre.trim() || !nuevoU.codigo.trim()) { setMsgU('⚠️ Nombre y código son obligatorios.'); return }
    const { error } = await supabase.rpc('master_crear_usuario', {
      p_master_telefono: tel, p_nombre: nuevoU.nombre.trim(),
      p_telefono_nuevo: nuevoU.prefijo + nuevoU.numero, p_codigo: nuevoU.codigo.trim()
    })
    if (error) { setMsgU('⚠️ ' + error.message); return }
    setNuevoU({ nombre: '', prefijo: '0414', numero: '', codigo: '' })
    setMostrarNuevoU(false); setMsgU(''); cargar()
  }

  if (loading) return <div className="panel"><div className="count-line">Cargando…</div></div>

  return (
    <div className="panel">
      <h2>Panel Master</h2>
      <p className="sub">Control total del sistema. Acceso restringido.</p>

      <Seccion titulo={`Centros de salud (${hospitales.length})`} icono="🏥">
        {mostrarNuevoH ? (
          <div className="insumo-item" style={{ marginBottom: 10 }}>
            <label>Nombre del centro</label>
            <input type="text" value={nuevoH.nombre}
              onChange={(e) => setNuevoH(s => ({ ...s, nombre: e.target.value }))}
              placeholder="Ej: Hospital Vargas" />
            <div className="row2" style={{ marginTop: 8 }}>
              <input type="text" value={nuevoH.identificador}
                onChange={(e) => setNuevoH(s => ({ ...s, identificador: e.target.value }))}
                placeholder="Identificador (ej: HV)" />
              <input type="text" value={nuevoH.codigo_acceso}
                onChange={(e) => setNuevoH(s => ({ ...s, codigo_acceso: e.target.value }))}
                placeholder="Código (ej: HV2026)" />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="cover-btn" onClick={crearHospital}>Crear</button>
              <button className="undo-btn" onClick={() => { setMostrarNuevoH(false); setMsgH('') }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button className="add-item-btn" style={{ marginBottom: 10 }} onClick={() => setMostrarNuevoH(true)}>
            + Nuevo centro de salud
          </button>
        )}
        {msgH && <div className="msg err">{msgH}</div>}

        {hospitales.map((h) => (
          <div className="insumo-item" key={h.id} style={{ opacity: h.activo ? 1 : 0.55 }}>
            <div className="item-line">
              <b>{h.nombre}</b>
              {!h.activo && <span className="tag-mini" style={{ background: '#eee', color: '#888' }}>Inactivo</span>}
            </div>
            {editandoH === h.id ? (
              <>
                <div className="row2" style={{ marginTop: 8 }}>
                  <input type="text" placeholder="Identificador" value={formH.identificador}
                    onChange={(e) => setFormH(s => ({ ...s, identificador: e.target.value }))} />
                  <input type="text" placeholder="Código" value={formH.codigo_acceso}
                    onChange={(e) => setFormH(s => ({ ...s, codigo_acceso: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="cover-btn" onClick={() => guardarHospital(h.id)}>Guardar</button>
                  <button className="undo-btn" onClick={() => setEditandoH(null)}>Cancelar</button>
                </div>
              </>
            ) : (
              <div className="item-sub">
                ID: <b>{h.identificador || '—'}</b> · Código: <b>{h.codigo_acceso || '—'}</b>
                {' · '}
                <button className="mini-link" onClick={() => {
                  setFormH({ identificador: h.identificador || '', codigo_acceso: h.codigo_acceso || '' })
                  setEditandoH(h.id)
                }}>Editar código</button>
                {' · '}
                <button className="mini-link"
                  style={{ color: h.activo ? 'var(--rojo)' : 'var(--verde)' }}
                  onClick={() => toggleHospital(h)}>
                  {h.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            )}
          </div>
        ))}
      </Seccion>

      <Seccion titulo={`Centros de acopio (${acopios.length})`} icono="📦">
        {mostrarNuevoA ? (
          <div className="insumo-item" style={{ marginBottom: 10 }}>
            <label>Nombre y apellido</label>
            <input type="text" value={nuevoA.nombre_completo}
              onChange={(e) => setNuevoA(s => ({ ...s, nombre_completo: e.target.value }))} />
            <label>Teléfono</label>
            <div className="telefono-row">
              <select value={nuevoA.prefijo} onChange={(e) => setNuevoA(s => ({ ...s, prefijo: e.target.value }))}>
                {PREFIJOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input type="text" inputMode="numeric" maxLength={7} placeholder="1234567"
                value={nuevoA.numero}
                onChange={(e) => setNuevoA(s => ({ ...s, numero: e.target.value.replace(/\D/g, '').slice(0, 7) }))}
                onPaste={(e) => e.preventDefault()} />
            </div>
            <label>Nombre del centro</label>
            <input type="text" value={nuevoA.nombre_centro}
              onChange={(e) => setNuevoA(s => ({ ...s, nombre_centro: e.target.value }))}
              placeholder="Ej: Anatómico" />
            <label>Código de acceso</label>
            <input type="text" value={nuevoA.codigo_acceso}
              onChange={(e) => setNuevoA(s => ({ ...s, codigo_acceso: e.target.value }))}
              placeholder="Ej: AC2026" />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="cover-btn" onClick={crearAcopio}>Crear</button>
              <button className="undo-btn" onClick={() => { setMostrarNuevoA(false); setMsgA('') }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button className="add-item-btn" style={{ marginBottom: 10 }} onClick={() => setMostrarNuevoA(true)}>
            + Nuevo centro de acopio
          </button>
        )}
        {msgA && <div className="msg err">{msgA}</div>}
        {acopios.length === 0 && <div className="empty">Sin centros registrados.</div>}
        {acopios.map((a) => (
          <div className="insumo-item" key={a.id} style={{ opacity: a.activo ? 1 : 0.55 }}>
            <div className="item-line">
              <b>{a.nombre_centro}</b>
              {!a.activo && <span className="tag-mini" style={{ background: '#eee', color: '#888' }}>Inactivo</span>}
            </div>
            {editandoA === a.id ? (
              <>
                <input type="text" style={{ marginTop: 8 }} placeholder="Código" value={formA.codigo_acceso}
                  onChange={(e) => setFormA({ codigo_acceso: e.target.value })} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="cover-btn" onClick={() => guardarAcopio(a.id)}>Guardar</button>
                  <button className="undo-btn" onClick={() => setEditandoA(null)}>Cancelar</button>
                </div>
              </>
            ) : (
              <div className="item-sub">
                {a.nombre_completo} · 📞 {a.telefono} · Código: <b>{a.codigo_acceso}</b>
                {' · '}
                <button className="mini-link" onClick={() => {
                  setFormA({ codigo_acceso: a.codigo_acceso || '' })
                  setEditandoA(a.id)
                }}>Editar código</button>
                {' · '}
                <button className="mini-link"
                  style={{ color: a.activo ? 'var(--rojo)' : 'var(--verde)' }}
                  onClick={() => toggleAcopio(a)}>
                  {a.activo ? 'Desactivar' : 'Activar'}
                </button>
                {' · '}
                <button className="mini-link" style={{ color: 'var(--rojo)' }} onClick={() => eliminarAcopio(a)}>
                  Eliminar
                </button>
              </div>
            )}
          </div>
        ))}
      </Seccion>

      <Seccion titulo={`Fundaciones (${fundaciones.length})`} icono="🤝">
        {mostrarNuevoF ? (
          <div className="insumo-item" style={{ marginBottom: 10 }}>
            <label>Nombre de la fundación</label>
            <input type="text" value={nuevoF.nombre}
              onChange={(e) => setNuevoF(s => ({ ...s, nombre: e.target.value }))}
              placeholder="Ej: Fundación Ejemplo" />
            <div className="row2" style={{ marginTop: 8 }}>
              <input type="text" value={nuevoF.identificador}
                onChange={(e) => setNuevoF(s => ({ ...s, identificador: e.target.value }))}
                placeholder="Identificador (ej: FE)" />
              <input type="text" value={nuevoF.codigo_acceso}
                onChange={(e) => setNuevoF(s => ({ ...s, codigo_acceso: e.target.value }))}
                placeholder="Código (ej: FE2026)" />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="cover-btn" onClick={crearFundacion}>Crear</button>
              <button className="undo-btn" onClick={() => { setMostrarNuevoF(false); setMsgF('') }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button className="add-item-btn" style={{ marginBottom: 10 }} onClick={() => setMostrarNuevoF(true)}>
            + Nueva fundación
          </button>
        )}
        {msgF && <div className="msg err">{msgF}</div>}

        {fundaciones.map((f) => (
          <div className="insumo-item" key={f.id} style={{ opacity: f.activo ? 1 : 0.55 }}>
            <div className="item-line">
              <b>{f.nombre}</b>
              {!f.activo && <span className="tag-mini" style={{ background: '#eee', color: '#888' }}>Inactivo</span>}
            </div>
            {editandoF === f.id ? (
              <>
                <div className="row2" style={{ marginTop: 8 }}>
                  <input type="text" placeholder="Identificador" value={formF.identificador}
                    onChange={(e) => setFormF(s => ({ ...s, identificador: e.target.value }))} />
                  <input type="text" placeholder="Código" value={formF.codigo_acceso}
                    onChange={(e) => setFormF(s => ({ ...s, codigo_acceso: e.target.value }))} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="cover-btn" onClick={() => guardarFundacion(f.id)}>Guardar</button>
                  <button className="undo-btn" onClick={() => setEditandoF(null)}>Cancelar</button>
                </div>
              </>
            ) : (
              <div className="item-sub">
                ID: <b>{f.identificador || '—'}</b> · Código: <b>{f.codigo_acceso || '—'}</b>
                {' · '}
                <button className="mini-link" onClick={() => {
                  setFormF({ identificador: f.identificador || '', codigo_acceso: f.codigo_acceso || '' })
                  setEditandoF(f.id)
                }}>Editar código</button>
                {' · '}
                <button className="mini-link"
                  style={{ color: f.activo ? 'var(--rojo)' : 'var(--verde)' }}
                  onClick={() => toggleFundacion(f)}>
                  {f.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            )}
          </div>
        ))}
      </Seccion>

      <Seccion titulo={`Usuarios Master (${usuarios.length})`} icono="👤">
        {mostrarNuevoU ? (
          <div className="insumo-item" style={{ marginBottom: 10 }}>
            <label>Nombre y apellido</label>
            <input type="text" value={nuevoU.nombre} onChange={(e) => setNuevoU(s => ({ ...s, nombre: e.target.value }))} />
            <label>Teléfono</label>
            <div className="telefono-row">
              <select value={nuevoU.prefijo} onChange={(e) => setNuevoU(s => ({ ...s, prefijo: e.target.value }))}>
                {PREFIJOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input type="text" inputMode="numeric" maxLength={7} placeholder="1234567"
                value={nuevoU.numero}
                onChange={(e) => setNuevoU(s => ({ ...s, numero: e.target.value.replace(/\D/g, '').slice(0, 7) }))}
                onPaste={(e) => e.preventDefault()} />
            </div>
            <label>Código de acceso</label>
            <input type="text" value={nuevoU.codigo} onChange={(e) => setNuevoU(s => ({ ...s, codigo: e.target.value }))} placeholder="Ej: MASTER2026" />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="cover-btn" onClick={crearUsuario}>Crear</button>
              <button className="undo-btn" onClick={() => { setMostrarNuevoU(false); setMsgU('') }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button className="add-item-btn" style={{ marginBottom: 10 }} onClick={() => setMostrarNuevoU(true)}>
            + Nuevo usuario master
          </button>
        )}
        {msgU && <div className="msg err">{msgU}</div>}

        {usuarios.map((u) => (
          <div className="insumo-item" key={u.id}>
            <div className="item-line"><b>{u.nombre}</b></div>
            <div className="item-sub">📞 {u.telefono} · Código: <b>{u.codigo_acceso}</b></div>
          </div>
        ))}
      </Seccion>
    </div>
  )
}