import { useState } from 'react'
import { supabase } from '../supabaseClient.js'

export default function Login({ onMedicoLogin, onAcopioLogin, onAdminLogin, onGoRegistro }) {
  const [rol, setRol] = useState('medico')
  const [correo, setCorreo] = useState('')
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')

    if (rol === 'medico') {
      const { data, error: err } = await supabase.rpc('login_medico_o_admin', {
        p_correo: correo.trim(),
        p_codigo: codigo.trim(),
      })
      setBusy(false)
      const perfil = data?.[0]
      if (err || !perfil) {
        console.error(err)
        setError('Correo o código incorrecto.')
        return
      }
      if (perfil.tipo === 'admin') {
        onAdminLogin('ADMIN', codigo.trim())
      } else {
        onMedicoLogin(perfil)
      }
    } else {
      const { data, error: err } = await supabase.rpc('login_centro_acopio_por_correo', {
        p_correo: correo.trim(),
      })
      setBusy(false)
      const perfil = data?.[0]
      if (err || !perfil) {
        console.error(err)
        setError('No encontramos un centro de acopio registrado con ese correo.')
        return
      }
      onAcopioLogin({ ...perfil, codigo: perfil.codigo_acceso })
    }
  }

  return (
    <div className="panel">
      <h2>Iniciar sesión</h2>

      <div className="role-switch">
        <button type="button" className={rol === 'medico' ? 'active' : ''} onClick={() => { setRol('medico'); setError('') }}>
          🩺 Personal médico
        </button>
        <button type="button" className={rol === 'acopio' ? 'active' : ''} onClick={() => { setRol('acopio'); setError('') }}>
          📦 Centro de acopio
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <label className="req">Correo</label>
        <input type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />

        {rol === 'medico' && (
          <>
            <label className="req">Código del hospital</label>
            <input type="text" required value={codigo} onChange={(e) => setCodigo(e.target.value)} />
          </>
        )}

        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Verificando…' : 'Ingresar'}
        </button>
        {error && <div className="msg err">{error}</div>}
      </form>

      <p className="sub" style={{ marginTop: 14 }}>
        ¿No tienes cuenta? <button type="button" className="mini-link" onClick={onGoRegistro}>Regístrate aquí</button>
      </p>
    </div>
  )
}