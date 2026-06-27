import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient.js'
import HospitalGroup from './HospitalGroup.jsx'

const urgenciaRank = { urgente: 0, alta: 1, mediana: 2, baja: 3 }

export default function NeedsList() {
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
      const ordenados = [...items].sort((a, b) => new Date(a.creado_en) - new Date(b.creado_en))
      const topRank = Math.min(...items.map((i) => urgenciaRank[i.urgencia]))
      const lastUpdate = Math.max(...items.map((i) => new Date(i.creado_en).getTime()))
      return { hospital, items: ordenados, topRank, lastUpdate }
    })
    arr.sort((a, b) => a.topRank - b.topRank || b.lastUpdate - a.lastUpdate)
    return arr
  }, [filteredItems])

  function setFilter(field, value) {
    setFilters((f) => ({ ...f, [field]: value }))
  }

  return (
    <div className="panel">
      <h2>Necesidades publicadas</h2>
      <p className="sub">
        Agrupadas por hospital. Marca lo que vas a llevar para que otros no dupliquen el esfuerzo.
      </p>

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
          <option value="cubierto">Cubierto</option>
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
        <HospitalGroup key={g.hospital} hospital={g.hospital} items={g.items} onChanged={loadNeeds} />
      ))}
    </div>
  )
}