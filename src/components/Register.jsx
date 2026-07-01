import { useState } from 'react'
import { supabase } from '../supabaseClient.js'

const PREFIJOS = ['0412', '0414', '0416', '0424', '0426', '0422']

function TelefonoInput({ prefijo, setPrefijo, numero, setNumero }) {
  return (
    <div className="telefono-row">
      <select value={prefijo} onChange={(e) => setPrefijo(e.target.value)}>
        {PREFIJOS.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
      <input
        type="text"
        inputMode="numeric"
        maxLength={7}
        placeholder="1234567"
        value={numero}
        onChange={(e) => setNumero(e.target.value.replace(/\D/g, '').slice(0, 7))}
        onPaste={(e) => e.preventDefault()}
      />
    </div>
  )
}

export default function Register({ onRegistrado, onGoLogin }) {
  const [prefijo, setPrefijo] = useState('0414')
  const [numero, setNumero] = useState('')
  const [nombre, setNombre] = useState('')
  const [codigo, setCodigo] = useState('')
  const [status, setStatus] = useState({ state: 'idle', msg: '' })

  async function handleSubmit(e) {
    e.preventDefault()
    if (numero.length !== 7) {
      setStatus({ state: 'err', msg: '⚠️ El número de teléfono debe tener 7 dígitos.' })
      return
    }
    setStatus({ state: 'loading', msg: 'Registrando…' })
    const telefono = prefijo + numero
    const { data, error } = await supabase.rpc('registrar_unificado', {
      p_telefono: telefono,
      p_nombre: nombre.trim(),
      p_codigo: codigo.trim(),
    })
    if (error) { setStatus({ state: 'err', msg: `⚠️ ${error.message}` }); return }
    if (!data) { setStatus({ state: 'err', msg: '⚠️ No se pudo registrar. Intenta de nuevo.' }); return }
    setStatus({ state: 'ok', msg: `✅ Registrado en ${data}. Ya puedes iniciar sesión con tu teléfono y el código.` })
    setTimeout(() => onRegistrado?.(), 1400)
  }

  return (
    <div className="panel">
      <h2>Registrarte</h2>

      <form onSubmit={handleSubmit}>
        <label className="req">Nombre y apellido</label>
        <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} />

        <label className="req">Número de teléfono</label>
        <TelefonoInput prefijo={prefijo} setPrefijo={setPrefijo} numero={numero} setNumero={setNumero} />

        <label className="req">Código de acceso</label>
        <input type="text" required value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="Ej: XXX2020" />

        <button type="submit" className="primary" disabled={status.state === 'loading'}>
          {status.state === 'loading' ? 'Registrando…' : 'Registrarme'}
        </button>
        {status.msg && <div className={`msg ${status.state === 'ok' ? 'ok' : status.state === 'err' ? 'err' : ''}`}>{status.msg}</div>}
      </form>

      <p className="sub" style={{ marginTop: 14 }}>
        ¿Ya tienes cuenta? <button type="button" className="mini-link" onClick={onGoLogin}>Inicia sesión aquí</button>
      </p>
    </div>
  )
}