import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient.js'
import { descargarCSV } from '../utils/csv.js'

const PREFIJOS = ['0412', '0414', '0416', '0424', '0426', '0422']

const fechaLegible = (v) => (v ? new Date(v).toLocaleString('es-VE') : '')
const siNo = (v) => (v ? 'Sí' : 'No')

// Columnas del CSV de necesidades: [cabecera, extractor]. Exporta TODAS las filas,
// incluyendo deshabilitadas y "no disponibles" (incluido === false).
const COLS_NECESIDADES = [
  ['Insumo', (n) => n.insumo],
  ['Cantidad', (n) => n.cantidad],
  ['Hospital', (n) => n.hospital],
  ['Servicio', (n) => n.servicio],
  ['Ciudad', (n) => n.ciudad],
  ['Estado (región)', (n) => n.estado],
  ['Urgencia', (n) => n.urgencia],
  ['Estado de cobertura', (n) => n.estado_cobertura],
  ['Disponible', (n) => (n.incluido === false ? 'No' : 'Sí')],
  ['Deshabilitada', (n) => siNo(n.deshabilitada)],
  ['No disponible marcado por', (n) => n.no_disponible_por],
  ['Creado por', (n) => n.creado_por],
  ['Contacto', (n) => n.contacto],
  ['Receptor nombre', (n) => n.receptor_nombre],
  ['Receptor telefono', (n) => n.receptor_telefono],
  ['Receptor telefono 2', (n) => n.receptor_telefono_2],
  ['Cubierto por', (n) => n.cubierto_por],
  ['Transportista nombre', (n) => n.transportista_nombre],
  ['Transportista telefono', (n) => n.transportista_telefono],
  ['Ubicación espontánea', (n) => n.ubicacion_espontanea],
  ['Notas', (n) => n.notas],
  ['Comentario', (n) => n.comentario],
  ['Nota recepción', (n) => n.nota_recepcion],
  ['Creado en', (n) => fechaLegible(n.creado_en)],
  ['Actualizado en', (n) => fechaLegible(n.actualizado_en)],
  ['Lote ID', (n) => n.lote_id],
  ['ID', (n) => n.id],
]

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
  const [necesidades, setNecesidades] = useState([])
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

  const [subadmins, setSubadmins] = useState([])
  const [editandoS, setEditandoS] = useState(null)
  const [formS, setFormS] = useState({ telefono: '', nombre_completo: '', codigo_acceso: '' })
  const [nuevoS, setNuevoS] = useState({ nombre_completo: '', prefijo: '0414', numero: '', codigo_acceso: 'SUBADMIN2026' })
  const [mostrarNuevoS, setMostrarNuevoS] = useState(false)
  const [msgS, setMsgS] = useState('')

  async function cargar() {
    setLoading(true)
    const [{ data: hData }, { data: aData }, { data: fData }, { data: uData }, { data: sData }, { data: nData }] = await Promise.all([
      supabase.rpc('master_listar_hospitales', { p_master_telefono: tel }),
      supabase.rpc('master_listar_acopios', { p_master_telefono: tel }),
      supabase.rpc('master_listar_fundaciones', { p_master_telefono: tel }),
      supabase.rpc('master_listar_usuarios', { p_master_telefono: tel }),
      supabase.rpc('master_listar_subadmins', { p_master_telefono: tel }),
      supabase.from('necesidades').select('*').order('creado_en', { ascending: false }),
    ])
    setHospitales(hData || [])
    setAcopios(aData || [])
    setFundaciones(fData || [])
    setUsuarios(uData || [])
    setSubadmins(sData || [])
    setNecesidades(nData || [])
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

  async function crearSubadmin() {
    if (nuevoS.numero.length !== 7) { setMsgS('⚠️ El número debe tener 7 dígitos.'); return }
    if (!nuevoS.nombre_completo.trim() || !nuevoS.codigo_acceso.trim()) { setMsgS('⚠️ Nombre y código son obligatorios.'); return }
    const { error } = await supabase.rpc('master_crear_subadmin', {
      p_master_telefono: tel,
      p_telefono: nuevoS.prefijo + nuevoS.numero,
      p_nombre_completo: nuevoS.nombre_completo.trim(),
      p_codigo_acceso: nuevoS.codigo_acceso.trim(),
    })
    if (error) { setMsgS('⚠️ ' + error.message); return }
    setNuevoS({ nombre_completo: '', prefijo: '0414', numero: '', codigo_acceso: 'SUBADMIN2026' })
    setMostrarNuevoS(false); setMsgS(''); cargar()
  }

  async function guardarSubadmin(id) {
    if (formS.telefono.replace(/\D/g, '').length < 10) { setMsgS('⚠️ Teléfono inválido.'); return }
    if (!formS.nombre_completo.trim() || !formS.codigo_acceso.trim()) { setMsgS('⚠️ Nombre y código son obligatorios.'); return }
    const { error } = await supabase.rpc('master_editar_subadmin', {
      p_master_telefono: tel,
      p_subadmin_id: id,
      p_telefono: formS.telefono.trim(),
      p_nombre_completo: formS.nombre_completo.trim(),
      p_codigo_acceso: formS.codigo_acceso.trim(),
    })
    if (error) { setMsgS('⚠️ ' + error.message); return }
    setEditandoS(null); setMsgS(''); cargar()
  }

  async function eliminarSubadmin(s) {
    if (!confirm(`¿Eliminar permanentemente a "${s.nombre_completo}"? Esta acción no se puede deshacer.`)) return
    const { error } = await supabase.rpc('master_eliminar_subadmin', { p_master_telefono: tel, p_subadmin_id: s.id })
    if (error) { setMsgS('⚠️ ' + error.message); return }
    cargar()
  }

  const EXPORTS = [
    { key: 'hospitales', archivo: 'centros_de_salud.csv',
      headers: ['Nombre', 'Identificador', 'Codigo de acceso', 'Estado'],
      filas: () => hospitales.map((h) => [h.nombre, h.identificador, h.codigo_acceso, h.activo ? 'Activo' : 'Inactivo']) },
    { key: 'acopios', archivo: 'centros_de_acopio.csv',
      headers: ['Nombre del centro', 'Responsable', 'Telefono', 'Codigo de acceso', 'Estado'],
      filas: () => acopios.map((a) => [a.nombre_centro, a.nombre_completo, a.telefono, a.codigo_acceso, a.activo ? 'Activo' : 'Inactivo']) },
    { key: 'fundaciones', archivo: 'fundaciones.csv',
      headers: ['Nombre', 'Identificador', 'Codigo de acceso', 'Estado'],
      filas: () => fundaciones.map((f) => [f.nombre, f.identificador, f.codigo_acceso, f.activo ? 'Activo' : 'Inactivo']) },
    { key: 'subadmins', archivo: 'subadmins.csv',
      headers: ['Nombre', 'Telefono', 'Codigo de acceso'],
      filas: () => subadmins.map((s) => [s.nombre_completo, s.telefono, s.codigo_acceso]) },
    { key: 'usuarios', archivo: 'usuarios_master.csv',
      headers: ['Nombre', 'Telefono', 'Codigo de acceso'],
      filas: () => usuarios.map((u) => [u.nombre, u.telefono, u.codigo_acceso]) },
  ]

  const exportarUno = (cfg) => descargarCSV(cfg.archivo, cfg.headers, cfg.filas())

  const exportarTodo = () => {
    const conDatos = EXPORTS.filter((cfg) => cfg.filas().length > 0)
    conDatos.forEach((cfg, i) => setTimeout(() => exportarUno(cfg), i * 300))
  }

  const expDe = (key) => EXPORTS.find((cfg) => cfg.key === key)

  const exportarNecesidades = () => {
    const headers = COLS_NECESIDADES.map((c) => c[0])
    const filas = necesidades.map((n) => COLS_NECESIDADES.map((c) => c[1](n)))
    descargarCSV('necesidades.csv', headers, filas)
  }

  if (loading) return <div className="panel"><div className="count-line">Cargando…</div></div>

  return (
    <div className="panel">
      <h2>Panel Master</h2>
      <p className="sub">Control total del sistema. Acceso restringido.</p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        <button className="add-item-btn" onClick={exportarTodo}>
          ⬇ Descargar códigos (CSV)
        </button>
        <button className="add-item-btn" onClick={exportarNecesidades} disabled={necesidades.length === 0}>
          ⬇ Descargar necesidades ({necesidades.length}) (CSV)
        </button>
      </div>

      <Seccion titulo={`Centros de salud (${hospitales.length})`} icono="🏥">
        <button className="mini-link" style={{ display: 'inline-block', marginBottom: 10 }}
          onClick={() => exportarUno(expDe('hospitales'))} disabled={hospitales.length === 0}>
          ⬇ Descargar CSV
        </button>
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
        <button className="mini-link" style={{ display: 'inline-block', marginBottom: 10 }}
          onClick={() => exportarUno(expDe('acopios'))} disabled={acopios.length === 0}>
          ⬇ Descargar CSV
        </button>
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
        <button className="mini-link" style={{ display: 'inline-block', marginBottom: 10 }}
          onClick={() => exportarUno(expDe('fundaciones'))} disabled={fundaciones.length === 0}>
          ⬇ Descargar CSV
        </button>
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

      <Seccion titulo={`Subadmins (${subadmins.length})`} icono="🛡️">
        <button className="mini-link" style={{ display: 'inline-block', marginBottom: 10 }}
          onClick={() => exportarUno(expDe('subadmins'))} disabled={subadmins.length === 0}>
          ⬇ Descargar CSV
        </button>
        {mostrarNuevoS ? (
          <div className="insumo-item" style={{ marginBottom: 10 }}>
            <label>Nombre y apellido</label>
            <input type="text" value={nuevoS.nombre_completo}
              onChange={(e) => setNuevoS(s => ({ ...s, nombre_completo: e.target.value }))} />
            <label>Teléfono</label>
            <div className="telefono-row">
              <select value={nuevoS.prefijo} onChange={(e) => setNuevoS(s => ({ ...s, prefijo: e.target.value }))}>
                {PREFIJOS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input type="text" inputMode="numeric" maxLength={7} placeholder="1234567"
                value={nuevoS.numero}
                onChange={(e) => setNuevoS(s => ({ ...s, numero: e.target.value.replace(/\D/g, '').slice(0, 7) }))}
                onPaste={(e) => e.preventDefault()} />
            </div>
            <label>Código de acceso</label>
            <input type="text" value={nuevoS.codigo_acceso}
              onChange={(e) => setNuevoS(s => ({ ...s, codigo_acceso: e.target.value }))}
              placeholder="Ej: SUBADMIN2026" />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button className="cover-btn" onClick={crearSubadmin}>Crear</button>
              <button className="undo-btn" onClick={() => { setMostrarNuevoS(false); setMsgS('') }}>Cancelar</button>
            </div>
          </div>
        ) : (
          <button className="add-item-btn" style={{ marginBottom: 10 }} onClick={() => setMostrarNuevoS(true)}>
            + Nuevo subadmin
          </button>
        )}
        {msgS && <div className="msg err">{msgS}</div>}
        {subadmins.length === 0 && <div className="empty">Sin subadmins registrados.</div>}
        {subadmins.map((s) => (
          <div className="insumo-item" key={s.id}>
            <div className="item-line"><b>{s.nombre_completo}</b></div>
            {editandoS === s.id ? (
              <>
                <div className="row2" style={{ marginTop: 8 }}>
                  <input type="text" placeholder="Nombre y apellido" value={formS.nombre_completo}
                    onChange={(e) => setFormS(f => ({ ...f, nombre_completo: e.target.value }))} />
                  <input type="text" inputMode="numeric" placeholder="Teléfono" value={formS.telefono}
                    onChange={(e) => setFormS(f => ({ ...f, telefono: e.target.value.replace(/\D/g, '').slice(0, 11) }))} />
                </div>
                <input type="text" placeholder="Código de acceso" style={{ marginTop: 8 }} value={formS.codigo_acceso}
                  onChange={(e) => setFormS(f => ({ ...f, codigo_acceso: e.target.value }))} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="cover-btn" onClick={() => guardarSubadmin(s.id)}>Guardar</button>
                  <button className="undo-btn" onClick={() => setEditandoS(null)}>Cancelar</button>
                </div>
              </>
            ) : (
              <div className="item-sub">
                📞 {s.telefono} · Código: <b>{s.codigo_acceso}</b>
                {' · '}
                <button className="mini-link" onClick={() => {
                  setFormS({ telefono: s.telefono || '', nombre_completo: s.nombre_completo || '', codigo_acceso: s.codigo_acceso || '' })
                  setEditandoS(s.id)
                }}>Editar</button>
                {' · '}
                <button className="mini-link" style={{ color: 'var(--rojo)' }} onClick={() => eliminarSubadmin(s)}>
                  Eliminar
                </button>
              </div>
            )}
          </div>
        ))}
      </Seccion>

      <Seccion titulo={`Usuarios Master (${usuarios.length})`} icono="👤">
        <button className="mini-link" style={{ display: 'inline-block', marginBottom: 10 }}
          onClick={() => exportarUno(expDe('usuarios'))} disabled={usuarios.length === 0}>
          ⬇ Descargar CSV
        </button>
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