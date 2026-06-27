import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient.js'

const OTRO_VALOR = '__OTRO__'

const URGENCIA_OPCIONES = [
  ['urgente', '🆘 Urgente: no queda'],
  ['alta', '🔴 Alta'],
  ['mediana', '🟡 Mediana'],
  ['baja', '🟢 Baja'],
]

let itemSeq = 0
function nuevoItem() {
  itemSeq += 1
  return { uid: `item-${itemSeq}`, insumo: '', cantidad: '', urgencia: '' }
}

const initialMeta = { hospital: '', hospitalOtro: '', contacto: '', notas: '' }

export default function NeedForm({ onPublished }) {
  const [meta, setMeta] = useState(initialMeta)
  const [items, setItems] = useState([nuevoItem()])
  const [status, setStatus] = useState({ state: 'idle', msg: '' })
  const [hospitales, setHospitales] = useState([])
  const [loadingHosp, setLoadingHosp] = useState(true)

  useEffect(() => {
    supabase.from('hospitales').select('nombre').order('orden').order('nombre')
      .then(({ data, error }) => {
        if (!error) setHospitales(data || [])
        setLoadingHosp(false)
      })
  }, [])

  function updateMeta(field, value) {
    setMeta((m) => ({ ...m, [field]: value }))
  }

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

    const esHospitalNuevo = meta.hospital === OTRO_VALOR
    const hospitalFinal = esHospitalNuevo ? meta.hospitalOtro.trim() : meta.hospital

    if (!hospitalFinal) {
      setStatus({ state: 'err', msg: 'Indica el nombre del hospital.' })
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

    // Si el hospital fue escrito a mano, lo agregamos a la lista para que
    // aparezca en el select la próxima vez. Si falla, no detenemos el
    // flujo principal — la necesidad de todas formas se publica.
    if (esHospitalNuevo) {
      const { error: errHosp } = await supabase
        .from('hospitales')
        .upsert([{ nombre: hospitalFinal }], { onConflict: 'nombre', ignoreDuplicates: true })
      if (!errHosp) {
        setHospitales((h) => (h.some((x) => x.nombre === hospitalFinal) ? h : [...h, { nombre: hospitalFinal }]))
      } else {
        console.error(errHosp)
      }
    }

    const filas = items.map((it) => ({
      hospital: hospitalFinal,
      estado: 'Caracas',
      ciudad: '',
      insumo: it.insumo.trim(),
      cantidad: it.cantidad.trim(),
      contacto: meta.contacto.trim(),
      urgencia: it.urgencia,
      notas: meta.notas.trim(),
    }))

    const { error } = await supabase.from('necesidades').insert(filas)

    if (error) {
      setStatus({ state: 'err', msg: '⚠️ No se pudo publicar. Intenta de nuevo en unos segundos.' })
      console.error(error)
      return
    }

    setStatus({
      state: 'ok',
      msg: `✅ ${filas.length} insumo${filas.length === 1 ? '' : 's'} publicado${filas.length === 1 ? '' : 's'}. Ya son visibles para los centros de acopio.`,
    })
    setMeta(initialMeta)
    setItems([nuevoItem()])
    setTimeout(() => onPublished?.(), 900)
  }

  return (
    <div className="panel">
      <h2>¿Qué insumos necesita tu hospital o centro de salud?</h2>
      <p className="sub">
        Agrega uno o varios insumos en el mismo reporte. Cada uno se publica
        por separado para que los centros de acopio puedan llevarlos
        individualmente.
      </p>

      <form onSubmit={handleSubmit}>
        <label className="req">Hospital o centro</label>
        <select
          required value={meta.hospital}
          onChange={(e) => updateMeta('hospital', e.target.value)}
        >
          <option value="">{loadingHosp ? 'Cargando hospitales…' : 'Selecciona…'}</option>
          {hospitales.map((h) => <option key={h.nombre} value={h.nombre}>{h.nombre}</option>)}
          <option value={OTRO_VALOR}>Otro (especificar)</option>
        </select>

        {meta.hospital === OTRO_VALOR && (
          <input
            type="text" required style={{ marginTop: 8 }}
            value={meta.hospitalOtro}
            onChange={(e) => updateMeta('hospitalOtro', e.target.value)}
            placeholder="Nombre del hospital o centro"
          />
        )}

        <label className="req">Contacto (tel./WhatsApp)</label>
        <input
          type="tel" required value={meta.contacto}
          onChange={(e) => updateMeta('contacto', e.target.value)}
          placeholder="Ej: 0414-1234567"
        />

        <label style={{ marginTop: 18 }}>Insumos necesitados</label>
        {items.map((item) => (
          <div className="insumo-item" key={item.uid}>
            {items.length > 1 && (
              <button
                type="button" className="remove-item-btn"
                onClick={() => removeItem(item.uid)}
                aria-label="Quitar este insumo"
              >✕</button>
            )}
            <div className="insumo-item-row">
              <input
                type="text" required value={item.insumo}
                onChange={(e) => updateItem(item.uid, 'insumo', e.target.value)}
                placeholder="Insumo necesario, ejemplo: jeringas"
              />
              <input
                type="text" value={item.cantidad}
                onChange={(e) => updateItem(item.uid, 'cantidad', e.target.value)}
                placeholder="Cantidad (opcional)"
              />
            </div>
            <div className="urgencia-pick compact">
              {URGENCIA_OPCIONES.map(([val, label]) => (
                <label key={val} className={item.urgencia === val ? `sel-${val}` : ''}>
                  <input
                    type="radio" name={`urgencia-${item.uid}`} value={val}
                    checked={item.urgencia === val}
                    onChange={() => updateItem(item.uid, 'urgencia', val)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        ))}

        <button type="button" className="add-item-btn" onClick={addItem}>
          + Agregar otro insumo
        </button>

        <label>Notas adicionales (opcional)</label>
        <textarea
          value={meta.notas}
          onChange={(e) => updateMeta('notas', e.target.value)}
          placeholder="Horario de recepción, persona a contactar, condiciones de acceso…"
        />

        <button type="submit" className="primary" disabled={status.state === 'loading'}>
          {status.state === 'loading' ? 'Publicando…' : 'Publicar necesidad'}
        </button>
        {status.msg && (
          <div className={`msg ${status.state === 'ok' ? 'ok' : status.state === 'err' ? 'err' : ''}`}>
            {status.msg}
          </div>
        )}
      </form>
    </div>
  )
}