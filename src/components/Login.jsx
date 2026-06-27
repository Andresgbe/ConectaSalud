import { useState } from 'react'
import { supabase } from '../supabaseClient.js'

export default function Login({ onLogin }) {
  const [identificador, setIdentificador] = useState('')
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    const { data, error: err } = await supabase.rpc('verificar_login', {
      p_identificador: identificador.trim(),
      p_codigo: codigo.trim(),
    })
    setBusy(false)
    if (err || !data) {
      setError('Identificador o código incorrecto.')
      return
    }
    onLogin(data)
  }

  return (
    <div className="panel">
      <h2>Iniciar sesión como hospital</h2>
      <p className="sub">
        Solo necesario para el personal del hospital que va a reportar necesidades.
      </p>
      <form onSubmit={handleSubmit}>
        <label className="req">Identificador</label>
        <input
          type="text" required value={identificador}
          onChange={(e) => setIdentificador(e.target.value)}
          placeholder="Ej: HU"
        />
        <label className="req">Código</label>
        <input
          type="text" required value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="Ej: HUC1956"
        />
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Verificando…' : 'Ingresar'}
        </button>
        {error && <div className="msg err">{error}</div>}
      </form>
    </div>
  )
}