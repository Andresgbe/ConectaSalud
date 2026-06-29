import { useState } from 'react'
import { supabase } from '../supabaseClient.js'

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

export default function NeedForm({ hospital, contacto, onPublished }) {
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState([nuevoItem()])
  const [status, setStatus] = useState({ state: 'idle', msg: '' })

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
    if (items.some((it) => !it.insumo.trim())) {
      setStatus({ state: 'err', msg: 'Cada insumo necesita un nombre.' })
      return
    }
    if (items.some((it) => !it.urgencia)) {
      setStatus({ state: 'err', msg: 'Selecciona la urgencia de cada insumo.' })
      return
    }

    setStatus({ state: 'loading', msg: 'Publicando…' })

    const filas = items.map((it) => ({
      hospital,
      estado: 'Caracas',
      ciudad: '',
      insumo: it.insumo.trim(),
      cantidad: it.cantidad.trim(),
      contacto: contacto, 
      urgencia: it.urgencia,
      notas: notas.trim(),
    }))

    const { error } = await supabase.from('necesidades').insert(filas)

    if (error) {
      setStatus({ state: 'err', msg: '⚠️ No se pudo publicar. Intenta de nuevo en unos segundos.' })
      console.error(error)
      return
    }

    setStatus({ state: 'ok', msg: `✅ ${filas.length} insumo${filas.length === 1 ? '' : 's'} publicado${filas.length === 1 ? '' : 's'}.` })
    setNotas('')
    setItems([nuevoItem()])
    setTimeout(() => onPublished?.(), 900)
  }

  return (
    <div className="panel">
      <h2>¿Qué insumos necesita {hospital}?</h2>
      <p className="sub">Agrega uno o varios insumos en el mismo reporte. Cada uno se publica por separado para que los centros de acopio puedan llevarlos individualmente.</p>

      <form onSubmit={handleSubmit}>

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