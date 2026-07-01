import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient.js'

export default function Anuncio({ masterCreds, subadminCreds }) {
  const gestor = masterCreds || subadminCreds
  const [anuncio, setAnuncio] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState('')
  const [busy, setBusy] = useState(false)

  async function cargar() {
    const { data } = await supabase.rpc('obtener_anuncio')
    setAnuncio(data && data.length > 0 ? data[0] : null)
    setLoading(false)
  }

  useEffect(() => {
    cargar()
    const channel = supabase
      .channel('anuncio-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'anuncio' }, () => {
        cargar()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function publicar() {
    if (!texto.trim()) return
    setBusy(true)
    const { error } = masterCreds
      ? await supabase.rpc('master_publicar_anuncio', {
          p_master_telefono: masterCreds.telefono,
          p_mensaje: texto.trim(),
        })
      : await supabase.rpc('subadmin_publicar_anuncio', {
          p_telefono: subadminCreds.telefono,
          p_mensaje: texto.trim(),
        })
    setBusy(false)
    if (!error) {
      setEditando(false)
      setTexto('')
      cargar()
    }
  }

  async function quitar() {
    if (!confirm('¿Quitar el anuncio?')) return
    setBusy(true)
    if (masterCreds) {
      await supabase.rpc('master_quitar_anuncio', { p_master_telefono: masterCreds.telefono })
    } else {
      await supabase.rpc('subadmin_quitar_anuncio', { p_telefono: subadminCreds.telefono })
    }
    setBusy(false)
    cargar()
  }

  if (loading) return null

  // Rol sin permisos de gestión: solo se muestra si hay un anuncio activo
  if (!gestor) {
    if (!anuncio) return null
    return (
      <div className="anuncio-banner">
        <span className="anuncio-label">Anuncio</span>
        <span className="anuncio-texto">{anuncio.mensaje}</span>
      </div>
    )
  }

  // Master o subadmin conectado: siempre ve la barra, con opción de agregar/editar/quitar
  return (
    <div className="anuncio-banner">
      <span className="anuncio-label">Anuncio</span>
      {editando ? (
        <div className="anuncio-edit">
          <input
            type="text"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe el anuncio…"
            autoFocus
          />
          <button className="cover-btn" disabled={busy} onClick={publicar}>Publicar</button>
          <button className="undo-btn" disabled={busy} onClick={() => { setEditando(false); setTexto('') }}>Cancelar</button>
        </div>
      ) : anuncio ? (
        <>
          <span className="anuncio-texto">{anuncio.mensaje}</span>
          <button className="mini-link" onClick={() => { setTexto(anuncio.mensaje); setEditando(true) }}>Editar</button>
          <button className="mini-link" style={{ color: 'var(--rojo)' }} disabled={busy} onClick={quitar}>Quitar</button>
        </>
      ) : (
        <button className="mini-link" onClick={() => setEditando(true)}>+ Agregar anuncio</button>
      )}
    </div>
  )
}