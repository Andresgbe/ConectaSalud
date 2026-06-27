import { useState } from 'react'
import { supabase } from '../supabaseClient.js'

export default function Login({ onLogin, onAdminLogin }) {
  const [stage, setStage] = useState('credenciales')
  const [identificador, setIdentificador] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nombrePersona, setNombrePersona] = useState('')
  const [hospitalVerificado, setHospitalVerificado] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleCredenciales(e) {
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
    if (data === 'ADMIN') {
      onAdminLogin(identificador.trim().toUpperCase(), codigo.trim())
      return
    }
    setHospitalVerificado(data)
    setStage('nombre')
  }

  async function handleNombre(e) {
    e.preventDefault()
    if (!nombrePersona.trim()) return
    setBusy(true)
    await supabase.from('logs_acceso').insert([{
      hospital: hospitalVerificado,
      nombre_persona: nombrePersona.trim(),
    }])
    setBusy(false)
    onLogin(hospitalVerificado, nombrePersona.trim(), identificador.trim().toUpperCase(), codigo.trim())
  }

  return (
    <div className="panel">
      <h2>Iniciar sesión como hospital</h2>
      <p className="sub">Solo necesario para el personal del hospital que va a reportar necesidades.</p>

      <form onSubmit={handleCredenciales}>
        <label className="req">Identificador</label>
        <input type="text" required value={identificador} onChange={(e) => setIdentificador(e.target.value)} />
        <label className="req">Código</label>
        <input type="text" required value={codigo} onChange={(e) => setCodigo(e.target.value)} />
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Verificando…' : 'Ingresar'}
        </button>
        {error && <div className="msg err">{error}</div>}
      </form>

      {stage === 'nombre' && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2 style={{ marginTop: 0 }}>¿Quién está ingresando?</h2>
            <p className="sub">Hospital: {hospitalVerificado}</p>
            <form onSubmit={handleNombre}>
              <input
                type="text" required autoFocus value={nombrePersona}
                onChange={(e) => setNombrePersona(e.target.value)}
                placeholder="Ejemplo: Antonio Guzmán"
              />
              <button type="submit" className="primary" disabled={busy}>
                {busy ? 'Ingresando…' : 'Continuar'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}