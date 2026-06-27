import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient.js'

function formatFecha(iso) {
  return new Date(iso).toLocaleString('es-VE')
}

export default function AdminPanel({ adminCreds }) {
  const [logs, setLogs] = useState([])
  const [hospitales, setHospitales] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ identificador: '', codigo_acceso: '' })
  const [msg, setMsg] = useState('')

  async function cargar() {
    setLoading(true)
    const [{ data: logsData }, { data: hospData }] = await Promise.all([
      supabase.rpc('admin_listar_logs', { p_admin_id: adminCreds.identificador, p_admin_codigo: adminCreds.codigo }),
      supabase.rpc('admin_listar_hospitales', { p_admin_id: adminCreds.identificador, p_admin_codigo: adminCreds.codigo }),
    ])
    setLogs(logsData || [])
    setHospitales(hospData || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  function startEdit(h) {
    setForm({ identificador: h.identificador || '', codigo_acceso: h.codigo_acceso || '' })
    setEditing(h.nombre)
    setMsg('')
  }

  async function guardar() {
    const { error } = await supabase.rpc('admin_actualizar_hospital', {
      p_admin_id: adminCreds.identificador,
      p_admin_codigo: adminCreds.codigo,
      p_hospital_nombre: editing,
      p_nuevo_identificador: form.identificador.trim(),
      p_nuevo_codigo: form.codigo_acceso.trim(),
    })
    if (error) { setMsg('⚠️ No se pudo guardar.'); console.error(error); return }
    setEditing(null)
    cargar()
  }

  return (
    <div className="panel">
      <h2>Panel de administración</h2>
      <p className="sub">Visible solo para el usuario admin.</p>

      {loading && <div className="count-line">Cargando…</div>}

      {!loading && (
        <>
          <h3 style={{ marginTop: 20 }}>Hospitales: identificador y código</h3>
          {hospitales.map((h) => (
            <div className="insumo-item" key={h.id}>
              <div className="item-line"><b>{h.nombre}</b></div>
              {editing === h.nombre ? (
                <>
                  <div className="row2" style={{ marginTop: 8 }}>
                    <input type="text" value={form.identificador} onChange={(e) => setForm((s) => ({ ...s, identificador: e.target.value }))} placeholder="Identificador" />
                    <input type="text" value={form.codigo_acceso} onChange={(e) => setForm((s) => ({ ...s, codigo_acceso: e.target.value }))} placeholder="Código" />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button className="cover-btn" onClick={guardar}>Guardar</button>
                    <button className="undo-btn" onClick={() => setEditing(null)}>Cancelar</button>
                  </div>
                  {msg && <div className="msg err">{msg}</div>}
                </>
              ) : (
                <div className="item-sub">
                  Identificador: <b>{h.identificador || '—'}</b> · Código: <b>{h.codigo_acceso || '—'}</b>
                  {' · '}<button className="mini-link" onClick={() => startEdit(h)}>Editar</button>
                </div>
              )}
            </div>
          ))}

          <h3 style={{ marginTop: 28 }}>Registros de acceso</h3>
          {logs.length === 0 && <div className="empty">Sin registros todavía.</div>}
          {logs.map((l) => (
            <div className="item-row" key={l.id}>
              <div className="item-content">
                <div className="item-line"><b>{l.nombre_persona}</b> — {l.hospital}</div>
                <div className="item-sub">{formatFecha(l.creado_en)}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}