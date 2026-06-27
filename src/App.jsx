import { useState } from 'react'
import NeedForm from './components/NeedForm.jsx'
import NeedsList from './components/NeedsList.jsx'
import FoodTab from './components/FoodTab.jsx'
import Login from './components/Login.jsx'

const STORAGE_KEY = 'hospital_logueado'

export default function App() {
  const [tab, setTab] = useState('ver')
  const [hospitalLogueado, setHospitalLogueado] = useState(
    () => localStorage.getItem(STORAGE_KEY) || ''
  )

  function handleLogin(nombreHospital) {
    localStorage.setItem(STORAGE_KEY, nombreHospital)
    setHospitalLogueado(nombreHospital)
    setTab('pedir')
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_KEY)
    setHospitalLogueado('')
    setTab('ver')
  }

  return (
    <>
      <header className="top">
        <div className="wrap">
          <h1>Reporte de insumos requeridos</h1>
          <p>
            Conecta hospitales que necesitan insumos médicos con centros de
            acopio y voluntarios que pueden llevarlos.
          </p>
        </div>
      </header>

      <div className="disclaimer">
        <div className="wrap">
         {/*  Esta es una herramienta <b>comunitaria, no oficial</b>. Los datos
          publicados aquí son visibles para cualquier persona. Para
          emergencias que pongan en riesgo vidas, contacta a Protección
          Civil, Cruz Roja Venezolana (0422-7994880) o llama al 171. */}
          {hospitalLogueado && (
            <>Conectado como <b>{hospitalLogueado}</b> · <button className="mini-link" onClick={handleLogout}>Cerrar sesión</button></>
          )}
        </div>
      </div>

      <div className="wrap">
        <nav className="tabs">
          <button
            className={tab === 'ver' ? 'active' : ''}
            onClick={() => setTab('ver')}
          >
            📃REPORTE DE INSUMOS REQUERIDOS
          </button>

          {hospitalLogueado ? (
            <button
              className={tab === 'pedir' ? 'active' : ''}
              onClick={() => setTab('pedir')}
            >
              🏥 REPORTAR NECESIDAD
            </button>
          ) : (
            <button
              className={tab === 'login' ? 'active' : ''}
              onClick={() => setTab('login')}
            >
              🔐 Iniciar sesión
            </button>
          )}

          <button className={tab === 'comida' ? 'active' : ''} onClick={() => setTab('comida')}>
            🍽️ Comida
          </button>
        </nav>

        {tab === 'ver' && <NeedsList />}
        {tab === 'pedir' && hospitalLogueado && (
          <NeedForm hospital={hospitalLogueado} onPublished={() => setTab('ver')} />
        )}
        {tab === 'login' && !hospitalLogueado && <Login onLogin={handleLogin} />}
        {tab === 'comida' && <FoodTab />}

        <footer className="note">
          Desarrollada por Andrés Gil, 26/6/2026 - 0412-6127323
        </footer>
      </div>
    </>
  )
}