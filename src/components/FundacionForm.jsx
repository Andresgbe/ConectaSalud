import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient.js'

const URGENCIA_OPCIONES = [
  ['urgente', '🆘 Urgente: no queda'],
  ['alta', '🔴 Alta'],
  ['mediana', '🟡 Mediana'],
  ['baja', '🟢 Baja'],
]
const PREFIJOS = ['0412', '0414', '0416', '0424', '0426', '0422']
const HOSPITAL_ESPONTANEO = 'Puestos de salud espontáneos'

function TelefonoInput({ prefijo, setPrefijo, numero, setNumero, placeholder }) {
  return (
    <div className="telefono-row">
      <select value={prefijo} onChange={(e) => setPrefijo(e.target.value)}>
        {PREFIJOS.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <input
        type="text"
        inputMode="numeric"
        maxLength={7}
        placeholder={placeholder || '1234567'}
        value={numero}
        onChange={(e) => setNumero(e.target.value.replace(/\D/g, '').slice(0, 7))}
        onPaste={(e) => e.preventDefault()}
      />
    </div>
  )
}

let itemSeq = 0
function nuevoItem() {
  itemSeq += 1
  return { uid: `item-${itemSeq}`, insumo: '', cantidad: '', urgencia: '' }
}

export default function FundacionForm({ contacto, creadoPor, onPublished }) {
  const [hospitales, setHospitales] = useState([])
  const [hospital, setHospital] = useState('')
  const [ubicacionEspontanea, setUbicacionEspontanea] = useState('')
  const [servicio, setServicio] = useState('')
  const [nombreRecibe, setNombreRecibe] = useState('')
  const [prefRecibe, setPrefRecibe] = useState('0414')
  const [numRecibe, setNumRecibe] = useState('')
  const [prefRecibe2, setPrefRecibe2] = useState('0414')
  const [numRecibe2, setNumRecibe2] = useState('')
  const [mostrarRecibe2, setMostrarRecibe2] = useState(false)
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState([nuevoItem()])
  const [status, setStatus] = useState({ state: 'idle', msg: '' })

  useEffect(() => {
    supabase.from('hospitales').select('nombre').order('orden').order('nombre')
      .then(({ data }) => setHospitales(data || []))
  }, [])

  function updateItem(uid, field, value) {
    setItems((list) => list.map((it) => (it.uid === uid ? { ...it, [field]: value } : it)))
  }
  function addItem() {
    setItems((list) => [...list, nuevoItem()])
  }
  function removeItem(uid) {
    setItems((list) => (list.length > 1 ? list.filter((it) => it.uid !== uid) : list))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!hospital) {
      setStatus({ state: 'err', msg: 'Selecciona el hospital.' })
      return
    }
    if (!servicio.trim()) {
      setStatus({ state: 'err', msg: 'Indica el servicio.' })
      return
    }
    if (hospital === HOSPITAL_ESPONTANEO && !ubicacionEspontanea.trim()) {   // ← nuevo bloque
      setStatus({ state: 'err', msg: 'Indica el nombre y ubicación del centro de salud.' })
      return
    }
    if (!nombreRecibe.trim()) {
      setStatus({ state: 'err', msg: 'Indica el nombre de quién recibe.' })
      return
    }
    if (numRecibe.length !== 7) {
      setStatus({ state: 'err', msg: 'Indica el teléfono de quién recibe (7 dígitos).' })
      return
    }
    if (items.some((it) => !it.insumo.trim())) {
      setStatus({ state: 'err', msg: 'Cada insumo necesita un nombre.' })
      return
    }
    if (items.some((it) => !it.urgencia)) {
      setStatus({ state: 'err', msg: 'Selecciona la urgencia de cada insumo.' })
      return
    }

    setStatus({ state: 'loading', msg: 'Publicando…' })

    const loteId = crypto.randomUUID()
    const filas = items.map((it) => ({
      hospital,
      estado: 'Caracas',
      ciudad: '',
      insumo: it.insumo.trim(),
      cantidad: it.cantidad.trim(),
      contacto: contacto,
      urgencia: it.urgencia,
      notas: notas.trim(),
      servicio: servicio.trim(),
      creado_por: creadoPor || null,
      receptor_nombre: nombreRecibe.trim() || null,
      receptor_telefono: prefRecibe + numRecibe,
      receptor_telefono_2: numRecibe2.length === 7 ? (prefRecibe2 + numRecibe2) : null,
      ubicacion_espontanea: hospital === HOSPITAL_ESPONTANEO ? ubicacionEspontanea.trim() : null,
      lote_id: loteId,
    }))

    const { error } = await supabase.from('necesidades').insert(filas)

    if (error) {
      setStatus({ state: 'err', msg: '⚠️ No se pudo publicar. Intenta de nuevo en unos segundos.' })
      console.error(error)
      return
    }

    setStatus({ state: 'ok', msg: `✅ ${filas.length} insumo${filas.length === 1 ? '' : 's'} publicado${filas.length === 1 ? '' : 's'}.` })
    setNotas('')
    setHospital('')
    setUbicacionEspontanea('')
    setServicio('')
    setNombreRecibe('')
    setNumRecibe('')
    setNumRecibe2('')
    setMostrarRecibe2(false)
    setItems([nuevoItem()])
    setTimeout(() => onPublished?.(), 900)
  }

  return (
    <div className="panel">
      <h2>Registrar necesidad para un centro de salud</h2>
      <p className="sub">Selecciona el centro de salud y agrega uno o varios insumos en el mismo reporte.</p>

      <form onSubmit={handleSubmit}>
        <label className="req">Centro de salud</label>
        <select required value={hospital} onChange={(e) => setHospital(e.target.value)}>
          <option value="">Selecciona un centro de salud</option>
          {hospitales.map((h) => (
            <option key={h.nombre} value={h.nombre}>{h.nombre}</option>
          ))}
        </select>
        {hospital === HOSPITAL_ESPONTANEO && (
          <>
            <label className="req">Nombre y ubicación del centro de salud</label>
            <input
              type="text"
              required
              value={ubicacionEspontanea}
              onChange={(e) => setUbicacionEspontanea(e.target.value)}
              placeholder="Ej: Puesto de salud La Vega, Av. Principal cerca del mercado"
            />
          </>
        )}
        <label className="req">Servicio</label>
        <input type="text" required value={servicio} onChange={(e) => setServicio(e.target.value)} placeholder="Ej: Cirugía" />

        <label className="req">¿Quién recibe?</label>
        <input
          type="text"
          required
          value={nombreRecibe}
          onChange={(e) => setNombreRecibe(e.target.value)}
          placeholder="Nombre de quién recibe"
          style={{ marginBottom: 8 }}
        />
        <TelefonoInput prefijo={prefRecibe} setPrefijo={setPrefRecibe} numero={numRecibe} setNumero={setNumRecibe} />

        {mostrarRecibe2 ? (
          <>
            <label>Teléfono de contacto 2 (opcional)</label>
            <TelefonoInput prefijo={prefRecibe2} setPrefijo={setPrefRecibe2} numero={numRecibe2} setNumero={setNumRecibe2} />
          </>
        ) : (
          <button type="button" className="mini-link" style={{ marginTop: 8 }} onClick={() => setMostrarRecibe2(true)}>
            + Agregar un teléfono de contacto adicional
          </button>
        )}

        <label style={{ marginTop: 18 }}>Insumos necesitados</label>
        {items.map((item) => (
          <div className="insumo-item" key={item.uid}>
            {items.length > 1 && (
              <button type="button" className="remove-item-btn" onClick={() => removeItem(item.uid)} aria-label="Quitar este insumo">✕</button>
            )}
            <div className="insumo-item-row">
              <input type="text" required value={item.insumo} onChange={(e) => updateItem(item.uid, 'insumo', e.target.value)} placeholder="Insumo necesario, ejemplo: jeringas" />
              <input type="text" value={item.cantidad} onChange={(e) => updateItem(item.uid, 'cantidad', e.target.value)} placeholder="Cantidad (opcional)" />
            </div>
            <div className="urgencia-pick compact">
              {URGENCIA_OPCIONES.map(([val, label]) => (
                <label key={val} className={item.urgencia === val ? `sel-${val}` : ''}>
                  <input type="radio" name={`urgencia-${item.uid}`} value={val} checked={item.urgencia === val} onChange={() => updateItem(item.uid, 'urgencia', val)} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ))}

        <button type="button" className="add-item-btn" onClick={addItem}>+ Agregar otro insumo</button>

        <label>Notas adicionales (opcional)</label>
        <textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Horario de recepción, persona a contactar, condiciones de acceso…" />

        <button type="submit" className="primary" disabled={status.state === 'loading'}>
          {status.state === 'loading' ? 'Publicando…' : 'Publicar necesidad'}
        </button>
        {status.msg && (
          <div className={`msg ${status.state === 'ok' ? 'ok' : status.state === 'err' ? 'err' : ''}`}>{status.msg}</div>
        )}
      </form>
    </div>
  )
}