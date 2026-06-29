import { useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import NeedForm from './components/NeedForm.jsx'
import NeedsList from './components/NeedsList.jsx'
import Login from './components/Login.jsx'
import Register from './components/Register.jsx'
import AdminPanel from './components/AdminPanel.jsx'

const K_MEDICO = 'medico_creds'
const K_ACOPIO = 'acopio_creds'
const K_ADMIN = 'admin_creds'

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

  function limpiarSesiones() {
    localStorage.removeItem(K_MEDICO)
    localStorage.removeItem(K_ACOPIO)
    localStorage.removeItem(K_ADMIN)
    setMedicoCreds(null)
    setAcopioCreds(null)
    setAdminCreds(null)
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

  const sesionActiva = medicoCreds || acopioCreds || adminCreds

  function nombreSesion() {
    if (adminCreds) return 'ADMIN'
    if (medicoCreds) return `${medicoCreds.nombre_completo} (${medicoCreds.hospital})`
    if (acopioCreds) return `${acopioCreds.nombre_completo} (${acopioCreds.nombre_centro})`
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
        <button type="button" className="section-label" onClick={() => navigate('/')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2h6a2 2 0 0 1 2 2v1H7V4a2 2 0 0 1 2-2z"/><path d="M7 5h10v15a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V5z"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
          Reporte de necesidades
        </button>

        {(medicoCreds || adminCreds) && (
          <nav className="tabs">
            {medicoCreds && (
              <button className={location.pathname === '/reportar' ? 'active' : ''} onClick={() => navigate('/reportar')}>
                🏥 REPORTAR NECESIDAD
              </button>
            )}

            {adminCreds && (
              <button className={location.pathname === '/admin' ? 'active' : ''} onClick={() => navigate('/admin')}>
                🛠️ Admin
              </button>
            )}
          </nav>
        )}

        <Routes>
          <Route path="/" element={<NeedsList isAdmin={!!adminCreds} adminCreds={adminCreds} acopioCreds={acopioCreds} medicoCreds={medicoCreds}/>} />

          <Route
            path="/reportar"
            element={
              medicoCreds
                ? <NeedForm hospital={medicoCreds.hospital} contacto={medicoCreds.telefono} onPublished={() => navigate('/')} />
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        <footer className="note">Desarrollada por Andrés Gil, 26/6/2026 - 0412-6127323</footer>
      </div>
    </>
  )
}