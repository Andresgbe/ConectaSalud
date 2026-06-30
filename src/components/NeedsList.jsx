import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient.js'
import NeedItem from './NeedItem.jsx'

function normalizar(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export default function NeedsList({ isAdmin, adminCreds, acopioCreds, medicoCreds, fundacionCreds, masterCreds, subadminCreds }) {
  const [verDeshabilitadas, setVerDeshabilitadas] = useState(false)
  const [needs, setNeeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ urgencia: '', status: '', texto: '' })
  const puedeMarcar = !!acopioCreds || !!fundacionCreds || !!medicoCreds || !!masterCreds || !!subadminCreds

  async function loadNeeds() {
    const { data, error } = await supabase
      .from('necesidades')
      .select('*')
      .order('creado_en', { ascending: false })
    if (!error) setNeeds(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadNeeds()
    const channel = supabase
      .channel('necesidades-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'necesidades' }, () => {
        loadNeeds()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const filteredItems = useMemo(() => {
    const txt = normalizar(filters.texto.trim())
    return needs.filter((n) => {
      if (n.deshabilitada) return false
      if (filters.urgencia && n.urgencia !== filters.urgencia) return false
      if (filters.status && n.estado_cobertura !== filters.status) return false
      if (txt && !(normalizar(n.insumo).includes(txt) || normalizar(n.hospital).includes(txt))) return false
      return true
    })
  }, [needs, filters])

  const deshabilitadas = useMemo(() => needs.filter((n) => n.deshabilitada), [needs])

  const hospitalesUnicos = useMemo(
    () => new Set(filteredItems.map((n) => n.hospital)).size,
    [filteredItems]
  )

  const stats = useMemo(() => ({
    pendientes: filteredItems.filter((n) => n.estado_cobertura === 'pendiente').length,
    hospitales: hospitalesUnicos,
    urgentes: filteredItems.filter((n) => n.urgencia === 'urgente').length,
  }), [filteredItems, hospitalesUnicos])

  function setFilter(field, value) {
    setFilters((f) => ({ ...f, [field]: value }))
  }

  return (
    <div className="panel">
      <h2>Necesidades registradas</h2>
      <p className="sub">
        Ordenadas de la más reciente a la más antigua. Marca lo que vas a llevar para que otros no dupliquen el esfuerzo.
      </p>

      <div className="stats-row">
        <div className="stat-card stat-pendientes">
          <span className="stat-icon-wrap">
            <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2h6a2 2 0 0 1 2 2v1H7V4a2 2 0 0 1 2-2z"/><path d="M7 5h10v15a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
          </span>
          <div className="stat-text">
            <span className="stat-num">{stats.pendientes}</span>
            <span className="stat-label">pendientes</span>
          </div>
        </div>
        <div className="stat-card stat-hospitales">
          <span className="stat-icon-wrap">
            <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg>
          </span>
          <div className="stat-text">
            <span className="stat-num">{stats.hospitales}</span>
            <span className="stat-label">centros de salud</span>
          </div>
        </div>
        <div className="stat-card stat-urgentes">
          <span className="stat-icon-wrap">
            <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
          </span>
          <div className="stat-text">
            <span className="stat-num">{stats.urgentes}</span>
            <span className="stat-label">urgente{stats.urgentes === 1 ? '' : 's'}</span>
          </div>
        </div>
      </div>

      <div className="filters">
        <select value={filters.urgencia} onChange={(e) => setFilter('urgencia', e.target.value)}>
          <option value="">Toda urgencia</option>
          <option value="urgente">🆘 Urgente: no queda</option>
          <option value="alta">🔴 Alta</option>
          <option value="mediana">🟡 Mediana</option>
          <option value="baja">🟢 Baja</option>
        </select>
        <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">Todo estado de cobertura</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_proceso">En proceso</option>
          <option value="lista_para_salir">Lista para salir</option>
          <option value="enviada">En camino</option>
          <option value="recibida">Recibida</option>
        </select>
        <input
          type="text" placeholder="Buscar insumo u hospital…"
          value={filters.texto} onChange={(e) => setFilter('texto', e.target.value)}
        />
      </div>

      <div className="count-line">
        {loading
          ? 'Cargando…'
          : `${filteredItems.length} insumo${filteredItems.length === 1 ? '' : 's'} en ${stats.hospitales} hospital${stats.hospitales === 1 ? '' : 'es'}`}
      </div>

      {!puedeMarcar && stats.pendientes > 0 && (
        <div className="status-line">
          <span className="item-sub">Inicia sesión como centro de acopio o fundación para marcar insumos como entregados.</span>
        </div>
      )}

      {!loading && filteredItems.length === 0 && (
        <div className="empty">No hay necesidades que coincidan con estos filtros todavía.</div>
      )}

      {filteredItems.map((item) => (
        <NeedItem
          key={item.id}
          item={item}
          onChanged={loadNeeds}
          isAdmin={isAdmin}
          adminCreds={adminCreds}
          acopioCreds={acopioCreds}
          medicoCreds={medicoCreds}
          fundacionCreds={fundacionCreds}
          masterCreds={masterCreds}
          subadminCreds={subadminCreds}
        />
      ))}

      {(masterCreds || subadminCreds) && (
        <div className="master-seccion" style={{ marginTop: 20 }}>
          <button type="button" className="master-seccion-header" onClick={() => setVerDeshabilitadas(v => !v)}>
            <span>🚫 Solicitudes deshabilitadas ({deshabilitadas.length})</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>{verDeshabilitadas ? '−' : '+'}</span>
          </button>
          {verDeshabilitadas && (
            <div className="master-seccion-body">
              {deshabilitadas.length === 0 && <div className="empty">No hay solicitudes deshabilitadas.</div>}
              {deshabilitadas.map((item) => (
                <NeedItem
                  key={item.id}
                  item={item}
                  onChanged={loadNeeds}
                  isAdmin={isAdmin}
                  adminCreds={adminCreds}
                  acopioCreds={acopioCreds}
                  medicoCreds={medicoCreds}
                  fundacionCreds={fundacionCreds}
                  masterCreds={masterCreds}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}