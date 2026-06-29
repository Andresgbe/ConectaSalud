import { useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import NeedForm from './components/NeedForm.jsx'
import NeedsList from './components/NeedsList.jsx'
import Login from './components/Login.jsx'
import Register from './components/Register.jsx'
import AdminPanel from './components/AdminPanel.jsx'
import Info from './components/Info.jsx'
import FoodTab from './components/FoodTab.jsx'
import FundacionForm from './components/FundacionForm.jsx'

const K_MEDICO = 'medico_creds'
const K_ACOPIO = 'acopio_creds'
const K_ADMIN = 'admin_creds'
const K_FUNDACION = 'fundacion_creds'

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

  const [medicoCreds, setMedicoCreds] = useState(() => {
    const raw = localStorage.getItem(K_MEDICO)
    return raw ? JSON.parse(raw) : null
  })
  const [acopioCreds, setAcopioCreds] = useState(() => {
    const raw = localStorage.getItem(K_ACOPIO)
    return raw ? JSON.parse(raw) : null
  })
  const [adminCreds, setAdminCreds] = useState(() => {
    const raw = localStorage.getItem(K_ADMIN)
    return raw ? JSON.parse(raw) : null
  })
  const [fundacionCreds, setFundacionCreds] = useState(() => {
    const raw = localStorage.getItem(K_FUNDACION)
    return raw ? JSON.parse(raw) : null
  })

  function limpiarSesiones() {
    localStorage.removeItem(K_MEDICO)
    localStorage.removeItem(K_ACOPIO)
    localStorage.removeItem(K_ADMIN)
    localStorage.removeItem(K_FUNDACION)
    setMedicoCreds(null)
    setAcopioCreds(null)
    setAdminCreds(null)
    setFundacionCreds(null)
  }

  function handleMedicoLogin(creds) {
    limpiarSesiones()
    localStorage.setItem(K_MEDICO, JSON.stringify(creds))
    setMedicoCreds(creds)
    navigate('/reportar')
  }

  function handleAcopioLogin(creds) {
    limpiarSesiones()
    localStorage.setItem(K_ACOPIO, JSON.stringify(creds))
    setAcopioCreds(creds)
    navigate('/')
  }

  function handleFundacionLogin(creds) {
    limpiarSesiones()
    localStorage.setItem(K_FUNDACION, JSON.stringify(creds))
    setFundacionCreds(creds)
    navigate('/')
  }

  function handleAdminLogin(identificador, codigo) {
    limpiarSesiones()
    const creds = { identificador, codigo }
    localStorage.setItem(K_ADMIN, JSON.stringify(creds))
    setAdminCreds(creds)
    navigate('/admin')
  }

  function handleLogout() {
    limpiarSesiones()
    navigate('/')
  }

  const sesionActiva = medicoCreds || acopioCreds || adminCreds || fundacionCreds

  function nombreSesion() {
    if (adminCreds) return 'ADMIN'
    if (medicoCreds) return `${medicoCreds.nombre_completo} (${medicoCreds.hospital})`
    if (acopioCreds) return `${acopioCreds.nombre_completo} (${acopioCreds.nombre_centro})`
    if (fundacionCreds) return `${fundacionCreds.nombre_completo} (${fundacionCreds.nombre_fundacion})`
    return ''
  } 
  return (
    <>
      <header className="top">
        <div className="wrap header-inner">
          <div className="header-brand">
            <div className="header-text">
              <h1>Reporte de necesidades registradas</h1>
              <p>Conecta personal médico que necesita insumos con centros de acopio y voluntarios.</p>
            </div>
            <div className="header-logos">
              <img src="/assets/logoucv.png" alt="Universidad Central de Venezuela" />
            </div>
          </div>
          <div className="header-auth">
            {sesionActiva ? (
              <div className="auth-status">
                Conectado como <b>{nombreSesion()}</b>
                {' · '}<button className="mini-link header-mini-link" onClick={handleLogout}>Cerrar sesión</button>
              </div>
            ) : (
              <div className="auth-buttons">
                <button className="auth-btn" onClick={() => navigate('/login')}>Iniciar sesión</button>
                <button className="auth-btn primary" onClick={() => navigate('/register')}>Registrarte</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="wrap">
        <div className="section-nav">
          <button
            type="button"
            className={`section-label${location.pathname === '/' ? ' active' : ''}`}
            onClick={() => navigate('/')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2h6a2 2 0 0 1 2 2v1H7V4a2 2 0 0 1 2-2z"/><path d="M7 5h10v15a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
            Reporte de necesidades
          </button>
          {(medicoCreds || fundacionCreds) && (
            <button
              type="button"
              className={`section-label${(location.pathname === '/reportar' || location.pathname === '/solicitar') ? ' active' : ''}`}
              onClick={() => navigate(medicoCreds ? '/reportar' : '/solicitar')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
              Reportar necesidad
            </button>
          )}
          <button
            type="button"
            className={`section-label${location.pathname === '/info' ? ' active' : ''}`}
            onClick={() => navigate('/info')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            ¿Cómo usar la página?
          </button>
          <button
            type="button"
            className={`section-label${location.pathname === '/comida' ? ' active' : ''}`}
            onClick={() => navigate('/comida')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
            Comida
          </button>
        </div>

        {adminCreds && (
          <nav className="tabs">
            <button className={location.pathname === '/admin' ? 'active' : ''} onClick={() => navigate('/admin')}>
              🛠️ Admin
            </button>
          </nav>
        )}

        <Routes>
          <Route path="/" element={<NeedsList isAdmin={!!adminCreds} adminCreds={adminCreds} acopioCreds={acopioCreds} medicoCreds={medicoCreds} fundacionCreds={fundacionCreds}/>} />

          <Route
            path="/reportar"
            element={
              medicoCreds
                ? <NeedForm hospital={medicoCreds.hospital} contacto={medicoCreds.telefono} creadoPor={medicoCreds.nombre_completo} onPublished={() => navigate('/')} />
                : <Navigate to="/login" replace />
            }
          />

          <Route
            path="/login"
            element={
              sesionActiva
                ? <Navigate to="/" replace />
                : <Login
                    onMedicoLogin={handleMedicoLogin}
                    onAcopioLogin={handleAcopioLogin}
                    onFundacionLogin={handleFundacionLogin}
                    onAdminLogin={handleAdminLogin}
                    onGoRegistro={() => navigate('/register')}
                  />
            }
          />

          <Route
            path="/register"
            element={
              sesionActiva
                ? <Navigate to="/" replace />
                : <Register
                    onRegistrado={() => navigate('/login')}
                    onGoLogin={() => navigate('/login')}
                  />
            }
          />

          <Route
            path="/admin"
            element={adminCreds ? <AdminPanel adminCreds={adminCreds} /> : <Navigate to="/login" replace />}
          />
          <Route path="/info" element={<Info />} />
          <Route path="/comida" element={<FoodTab medicoCreds={medicoCreds} adminCreds={adminCreds} />} />

          <Route
            path="/solicitar"
            element={
              fundacionCreds
                ? <FundacionForm contacto={fundacionCreds.telefono} creadoPor={fundacionCreds.nombre_completo} onPublished={() => navigate('/')} />
                : <Navigate to="/login" replace />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <footer className="note">Desarrollada por Andrés Gil, 26/6/2026 - 0412-6127323</footer>
      </div>
    </>
  )
}