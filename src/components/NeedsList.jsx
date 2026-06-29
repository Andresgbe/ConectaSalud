import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient.js'
import HospitalGroup from './HospitalGroup.jsx'

const urgenciaRank = { urgente: 0, alta: 1, mediana: 2, baja: 3 }

export default function NeedsList({ isAdmin, adminCreds, acopioCreds, medicoCreds }) {
  const [needs, setNeeds] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ urgencia: '', status: '', texto: '' })

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
    const txt = filters.texto.trim().toLowerCase()
    return needs.filter((n) => {
      if (filters.urgencia && n.urgencia !== filters.urgencia) return false
      if (filters.status && n.estado_cobertura !== filters.status) return false
      if (txt && !(n.insumo.toLowerCase().includes(txt) || n.hospital.toLowerCase().includes(txt))) return false
      return true
    })
  }, [needs, filters])

  // Agrupamos por hospital. Dentro de cada grupo, los insumos se ordenan
  // del más viejo al más nuevo (orden cronológico de publicación).
  const groups = useMemo(() => {
    const map = new Map()
    for (const item of filteredItems) {
      if (!map.has(item.hospital)) map.set(item.hospital, [])
      map.get(item.hospital).push(item)
    }
    const arr = Array.from(map.entries()).map(([hospital, items]) => {
      const ordenados = [...items].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
      const lastUpdate = Math.max(...items.map((i) => new Date(i.creado_en).getTime()))
      return { hospital, items: ordenados, lastUpdate }
    })
    arr.sort((a, b) => b.lastUpdate - a.lastUpdate)
    return arr
  }, [filteredItems])

  const stats = useMemo(() => ({
    pendientes: filteredItems.filter((n) => n.estado_cobertura === 'pendiente').length,
    hospitales: groups.length,
    urgentes: filteredItems.filter((n) => n.urgencia === 'urgente').length,
  }), [filteredItems, groups])

  function setFilter(field, value) {
    setFilters((f) => ({ ...f, [field]: value }))
  }

  return (
    <div className="panel">
      <h2>Necesidades registradas</h2>
      <p className="sub">
        Agrupadas por hospital. Marca lo que vas a llevar para que otros no dupliquen el esfuerzo.
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
            <span className="stat-label">hospital{stats.hospitales === 1 ? '' : 'es'}</span>
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
          <option value="entregado">Entregado</option>
        </select>
        <input
          type="text" placeholder="Buscar insumo u hospital…"
          value={filters.texto} onChange={(e) => setFilter('texto', e.target.value)}
        />
        <button type="button" onClick={loadNeeds}>🔄 Actualizar</button>
      </div>

      <div className="count-line">
        {loading
          ? 'Cargando…'
          : `${filteredItems.length} insumo${filteredItems.length === 1 ? '' : 's'} en ${groups.length} hospital${groups.length === 1 ? '' : 'es'}`}
      </div>

      {!loading && groups.length === 0 && (
        <div className="empty">No hay necesidades que coincidan con estos filtros todavía.</div>
      )}

      {groups.map((g) => (
        <HospitalGroup key={g.hospital} hospital={g.hospital} items={g.items} onChanged={loadNeeds} isAdmin={isAdmin} adminCreds={adminCreds} acopioCreds={acopioCreds} medicoCreds={medicoCreds} />
      ))}
    </div>
  )
}