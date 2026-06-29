import { useState } from 'react'
import { supabase } from '../supabaseClient.js'

export default function Register({ onRegistrado, onGoLogin }) {
  const [rol, setRol] = useState('medico')

  const [telefono, setTelefono] = useState('')
  const [correo, setCorreo] = useState('')
  const [nombre, setNombre] = useState('')
  const [servicio, setServicio] = useState('')
  const [hospCodigo, setHospCodigo] = useState('')

  const [telefonoAc, setTelefonoAc] = useState('')
  const [nombreAc, setNombreAc] = useState('')
  const [nombreCentro, setNombreCentro] = useState('')
  const [correoAc, setCorreoAc] = useState('')

  const [status, setStatus] = useState({ state: 'idle', msg: '' })

  async function handleSubmitMedico(e) {
    e.preventDefault()
    setStatus({ state: 'loading', msg: 'Registrando…' })
    const { data, error } = await supabase.rpc('registrar_personal_medico', {
      p_telefono: telefono.trim(),
      p_correo: correo.trim(),
      p_nombre: nombre.trim(),
      p_servicio: servicio.trim(),
      p_hospital_codigo: hospCodigo.trim(),
    })
    if (error) {
  setStatus({ state: 'err', msg: `⚠️ ${error.message}` })
  return
  }
  if (error) {
  setStatus({ state: 'err', msg: `⚠️ ${error.message}` })
  return
  }
  if (!data) {
    setStatus({ state: 'err', msg: '⚠️ No se pudo registrar. Intenta de nuevo.' })
    return
  }
    setStatus({ state: 'ok', msg: `✅ Registrado en ${data}. Ya puedes iniciar sesión con tu correo y el código del hospital.` })
    setTimeout(() => onRegistrado?.(), 1400)
  }

  async function handleSubmitAcopio(e) {
    e.preventDefault()
    setStatus({ state: 'loading', msg: 'Registrando…' })
    const { data, error } = await supabase.rpc('registrar_centro_acopio', {
      p_telefono: telefonoAc.trim(),
      p_correo: correoAc.trim(),
      p_nombre: nombreAc.trim(),
      p_nombre_centro: nombreCentro.trim(),
    })
    if (error || !data) {
      setStatus({ state: 'err', msg: '⚠️ No se pudo registrar. Intenta de nuevo.' })
      return
    }
    setStatus({ state: 'ok', msg: '✅ ¡Listo! Ya puedes iniciar sesión con tu correo.' })
    setTimeout(() => onRegistrado?.(), 1400)
  }

  return (
    <div className="panel">
      <h2>Registrarte</h2>

      <div className="role-switch">
        <button type="button" className={rol === 'medico' ? 'active' : ''} onClick={() => { setRol('medico'); setStatus({ state: 'idle', msg: '' }) }}>
          Personal médico
        </button>
        <button type="button" className={rol === 'acopio' ? 'active' : ''} onClick={() => { setRol('acopio'); setStatus({ state: 'idle', msg: '' }) }}>
          Centro de acopio
        </button>
      </div>

      {rol === 'medico' ? (
        <form onSubmit={handleSubmitMedico}>
          <label className="req">Número de teléfono</label>
          <input type="tel" required value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Ej: 0414-1234567" />

          <label className="req">Correo</label>
          <input type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />

          <label className="req">Nombre y apellido</label>
          <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} />

          <label className="req">Servicio</label>
          <input type="text" required value={servicio} onChange={(e) => setServicio(e.target.value)} placeholder="Ej: Cirugía" />

          <label className="req">Código del hospital</label>
          <input type="text" required value={hospCodigo} onChange={(e) => setHospCodigo(e.target.value)} />

          <button type="submit" className="primary" disabled={status.state === 'loading'}>
            {status.state === 'loading' ? 'Registrando…' : 'Registrarme'}
          </button>
          {status.msg && <div className={`msg ${status.state === 'ok' ? 'ok' : status.state === 'err' ? 'err' : ''}`}>{status.msg}</div>}
        </form>
      ) : (
        <form onSubmit={handleSubmitAcopio}>
          <label className="req">Nombre y apellido</label>
          <input type="text" required value={nombreAc} onChange={(e) => setNombreAc(e.target.value)} />

          <label className="req">Número de teléfono</label>
          <input type="tel" required value={telefonoAc} onChange={(e) => setTelefonoAc(e.target.value)} placeholder="Ej: 0414-1234567" />

          <label className="req">Correo</label>
          <input type="email" required value={correoAc} onChange={(e) => setCorreoAc(e.target.value)} />

          <label className="req">Nombre del centro</label>
          <input type="text" required value={nombreCentro} onChange={(e) => setNombreCentro(e.target.value)} />

          <button type="submit" className="primary" disabled={status.state === 'loading'}>
            {status.state === 'loading' ? 'Registrando…' : 'Registrarme'}
          </button>
          {status.msg && <div className={`msg ${status.state === 'ok' ? 'ok' : status.state === 'err' ? 'err' : ''}`}>{status.msg}</div>}
        </form>
      )}

      <p className="sub" style={{ marginTop: 14 }}>
        ¿Ya tienes cuenta? <button type="button" className="mini-link" onClick={onGoLogin}>Inicia sesión aquí</button>
      </p>
    </div>
  )
}