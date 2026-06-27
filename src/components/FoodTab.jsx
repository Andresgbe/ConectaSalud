import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient.js'

const OPCIONES = [
  ['no_hay', '🔴 No hay'],
  ['queda_poco', '🟡 Queda poco'],
  ['suficiente', '🟢 Suficiente'],
]
const LABEL = { no_hay: '🔴 No hay', queda_poco: '🟡 Queda poco', suficiente: '🟢 Suficiente', sin_dato: '⚪ Sin reportar' }
const RANK = { no_hay: 0, queda_poco: 1, sin_dato: 2, suficiente: 3 }

function timeAgo(iso) {
  if (!iso) return ''
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'hace un momento'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs} h`
  return `hace ${Math.floor(hrs / 24)} d`
}

export default function FoodTab({ hospitalCreds, adminCreds }) {
  const isAdmin = !!adminCreds
  const loggedHospital = hospitalCreds?.nombre || null

  const [hospitales, setHospitales] = useState([])
  const [estados, setEstados] = useState({})
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ perecederos: '', no_perecederos: '', notas: '' })
  const [busy, setBusy] = useState(false)
  const [texto, setTexto] = useState('')

  async function loadAll() {
    const [{ data: hData }, { data: eData }] = await Promise.all([
      supabase.from('hospitales').select('nombre').order('orden').order('nombre'),
      supabase.from('estado_comida').select('*'),
    ])
    setHospitales(hData || [])
    const map = {}
    ;(eData || []).forEach((row) => { map[row.hospital] = row })
    setEstados(map)
    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    const channel = supabase
      .channel('estado_comida-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estado_comida' }, loadAll)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const filas = useMemo(() => {
    const txt = texto.trim().toLowerCase()
    return hospitales
      .filter((h) => !txt || h.nombre.toLowerCase().includes(txt))
      .map((h) => {
        const e = estados[h.nombre]
        const perecederos = e?.perecederos || 'sin_dato'
        const no_perecederos = e?.no_perecederos || 'sin_dato'
        const rank = Math.min(RANK[perecederos], RANK[no_perecederos])
        return { hospital: h.nombre, perecederos, no_perecederos, notas: e?.notas || '', actualizado_en: e?.actualizado_en, rank }
      })
      .sort((a, b) => a.rank - b.rank)
  }, [hospitales, estados, texto])

  function startEdit(f) {
    setForm({
      perecederos: f.perecederos === 'sin_dato' ? '' : f.perecederos,
      no_perecederos: f.no_perecederos === 'sin_dato' ? '' : f.no_perecederos,
      notas: f.notas,
    })
    setEditing(f.hospital)
  }

  async function guardar() {
    if (!form.perecederos || !form.no_perecederos) return
    setBusy(true)
    const creds = isAdmin ? adminCreds : hospitalCreds
    const { error } = await supabase.rpc('actualizar_comida', {
      p_identificador: creds.identificador,
      p_codigo: creds.codigo,
      p_hospital: editing,
      p_perecederos: form.perecederos,
      p_no_perecederos: form.no_perecederos,
      p_notas: form.notas.trim(),
    })
    setBusy(false)
    if (!error) {
      setEditing(null)
      loadAll()
    } else {
      console.error(error)
    }
  }

  return (
    <div className="panel">
      <h2>Estado de alimentos por hospital</h2>
      <p className="sub">Indica si cada hospital tiene alimentos perecederos y no perecederos, o si se están agotando.</p>

      <div className="filters">
        <input type="text" placeholder="Buscar hospital…" value={texto} onChange={(e) => setTexto(e.target.value)} />
      </div>

      {loading && <div className="count-line">Cargando…</div>}

      {!loading && filas.map((f) => {
        const puedeEditar = isAdmin || f.hospital === loggedHospital
        return (
          <div className={`food-card f-${f.rank}`} key={f.hospital}>
            <div className="need-top">
              <h3>{f.hospital}</h3>
            </div>
            {f.actualizado_en && <div className="need-meta">Actualizado {timeAgo(f.actualizado_en)}</div>}

            <div className="food-row">
              <span className="food-label">Perecederos:</span>
              <span className={`food-chip ${f.perecederos}`}>{LABEL[f.perecederos]}</span>
            </div>
            <div className="food-row">
              <span className="food-label">No perecederos:</span>
              <span className={`food-chip ${f.no_perecederos}`}>{LABEL[f.no_perecederos]}</span>
            </div>
            {f.notas && <div className="need-notas">{f.notas}</div>}

            <div className="status-line">
              {puedeEditar ? (
                <button className="claim-btn" onClick={() => startEdit(f)}>Actualizar estado</button>
              ) : (
                <span className="item-sub">Solo el personal de este hospital puede actualizar su estado.</span>
              )}
            </div>

            {editing === f.hospital && (
              <div className="insumo-item" style={{ marginTop: 10 }}>
                <label style={{ marginTop: 0 }}>Alimentos perecederos</label>
                <div className="food-pick">
                  {OPCIONES.map(([val, label]) => (
                    <label key={val} className={form.perecederos === val ? `sel-${val}` : ''}>
                      <input type="radio" name="perecederos" value={val} checked={form.perecederos === val} onChange={() => setForm((s) => ({ ...s, perecederos: val }))} />
                      {label}
                    </label>
                  ))}
                </div>
                <label>Alimentos no perecederos</label>
                <div className="food-pick">
                  {OPCIONES.map(([val, label]) => (
                    <label key={val} className={form.no_perecederos === val ? `sel-${val}` : ''}>
                      <input type="radio" name="no_perecederos" value={val} checked={form.no_perecederos === val} onChange={() => setForm((s) => ({ ...s, no_perecederos: val }))} />
                      {label}
                    </label>
                  ))}
                </div>
                <label>Notas (opcional)</label>
                <input type="text" value={form.notas} onChange={(e) => setForm((s) => ({ ...s, notas: e.target.value }))} placeholder="Ej: necesitan sobre todo leche y agua" />
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="cover-btn" disabled={busy} onClick={guardar}>Guardar</button>
                  <button className="undo-btn" onClick={() => setEditing(null)}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}