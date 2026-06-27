import { useState } from 'react'
import NeedForm from './components/NeedForm.jsx'
import NeedsList from './components/NeedsList.jsx'
import FoodTab from './components/FoodTab.jsx'
import Login from './components/Login.jsx'
import AdminPanel from './components/AdminPanel.jsx'

const K_HOSPITAL = 'hospital_creds'
const K_ADMIN = 'admin_creds'

export default function App() {
  const [tab, setTab] = useState('ver')
  const [hospitalCreds, setHospitalCreds] = useState(() => {
    const raw = localStorage.getItem(K_HOSPITAL)
    return raw ? JSON.parse(raw) : null
  })
  const [adminCreds, setAdminCreds] = useState(() => {
    const raw = localStorage.getItem(K_ADMIN)
    return raw ? JSON.parse(raw) : null
  })

  function handleLogin(nombreHospital, nombrePersona, identificador, codigo) {
    const creds = { nombre: nombreHospital, persona: nombrePersona, identificador, codigo }
    localStorage.setItem(K_HOSPITAL, JSON.stringify(creds))
    setHospitalCreds(creds)
    setTab('pedir')
  }

  function handleAdminLogin(identificador, codigo) {
    const creds = { identificador, codigo }
    localStorage.setItem(K_ADMIN, JSON.stringify(creds))
    setAdminCreds(creds)
    setTab('admin')
  }

  function handleLogout() {
    localStorage.removeItem(K_HOSPITAL)
    localStorage.removeItem(K_ADMIN)
    setHospitalCreds(null)
    setAdminCreds(null)
    setTab('ver')
  }

  const sesionActiva = hospitalCreds || adminCreds

  return (
    <>
      <header className="top">
        <div className="wrap">
          <h1>Reporte de insumos requeridos</h1>
          <p>Conecta hospitales que necesitan insumos médicos con centros de acopio y voluntarios que pueden llevarlos.</p>
        </div>
      </header>

      <div className="disclaimer">
        <div className="wrap">
          {sesionActiva && (
            <>
              Conectado como <b>{adminCreds ? 'ADMIN' : `${hospitalCreds.nombre} (${hospitalCreds.persona})`}</b>
              {' · '}<button className="mini-link" onClick={handleLogout}>Cerrar sesión</button>
            </>
          )}
        </div>
      </div>

      <div className="wrap">
        <nav className="tabs">
          <button className={tab === 'ver' ? 'active' : ''} onClick={() => setTab('ver')}>
            📃REPORTE DE INSUMOS REQUERIDOS
          </button>

          {hospitalCreds ? (
            <button className={tab === 'pedir' ? 'active' : ''} onClick={() => setTab('pedir')}>
              🏥 REPORTAR NECESIDAD
            </button>
          ) : !adminCreds ? (
            <button className={tab === 'pedir' ? 'active' : ''} onClick={() => setTab('pedir')}>
              📝 REGISTRAR NECESIDAD
            </button>
          ) : null}

          <button className={tab === 'comida' ? 'active' : ''} onClick={() => setTab('comida')}>
            🍽️ Comida
          </button>

          {adminCreds && (
            <button className={tab === 'admin' ? 'active' : ''} onClick={() => setTab('admin')}>
              🛠️ Admin
            </button>
          )}
        </nav>

        {tab === 'ver' && <NeedsList isAdmin={!!adminCreds} adminCreds={adminCreds} />}
        {tab === 'pedir' && hospitalCreds && (
          <NeedForm hospital={hospitalCreds.nombre} onPublished={() => setTab('ver')} />
        )}
        {tab === 'pedir' && !hospitalCreds && !adminCreds && (
          <Login onLogin={handleLogin} onAdminLogin={handleAdminLogin} />
        )}
        {tab === 'comida' && <FoodTab hospitalCreds={hospitalCreds} adminCreds={adminCreds} />}
        {tab === 'admin' && adminCreds && <AdminPanel adminCreds={adminCreds} />}

        <footer className="note">Desarrollada por Andrés Gil, 26/6/2026 - 0412-6127323</footer>
      </div>
    </>
  )
}