import { useState } from 'react'
import { supabase } from '../supabaseClient.js'

const PREFIJOS = ['0412', '0414', '0416', '0424', '0426', '0422']

export default function Login({ onMedicoLogin, onAcopioLogin, onFundacionLogin, onMasterLogin, onAdminLogin, onGoRegistro }) {
  const [prefijo, setPrefijo] = useState('0414')
  const [numero, setNumero] = useState('')
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const telefono = prefijo + numero

  async function handleSubmit(e) {
    e.preventDefault()
    if (numero.length !== 7) {
      setError('El número debe tener 7 dígitos.')
      return
    }
    setBusy(true)
    setError('')

    const { data, error: err } = await supabase.rpc('login_unificado_telefono', {
      p_telefono: telefono,
      p_codigo: codigo.trim(),
    })

    if (!err && data?.[0]) {
      const perfil = { ...data[0], telefono, codigo: data[0].codigo_acceso }
      setBusy(false)
      if (perfil.tipo === 'master') return onMasterLogin(perfil)
      if (perfil.tipo === 'medico') return onMedicoLogin(perfil)
      if (perfil.tipo === 'acopio') return onAcopioLogin(perfil)
      if (perfil.tipo === 'fundacion') return onFundacionLogin(perfil)
    }

    const { data: adminData, error: adminErr } = await supabase.rpc('login_medico_o_admin', {
      p_correo: telefono,
      p_codigo: codigo.trim(),
    })
    setBusy(false)
    if (!adminErr && adminData?.[0]?.tipo === 'admin') {
      return onAdminLogin('ADMIN', codigo.trim())
    }

    setError('Teléfono o código incorrecto.')
  }

  return (
    <div className="panel">
      <h2>Iniciar sesión</h2>

      <form onSubmit={handleSubmit}>
        <label className="req">Número de teléfono</label>
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

        <label className="req">Código de acceso</label>
        <input
          type="text"
          required
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="Ej: HUC2026"
        />

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