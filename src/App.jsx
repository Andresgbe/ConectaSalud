import { useState } from 'react'
import NeedForm from './components/NeedForm.jsx'
import NeedsList from './components/NeedsList.jsx'

export default function App() {
  const [tab, setTab] = useState('ver')

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
          <button
            className={tab === 'pedir' ? 'active' : ''}
            onClick={() => setTab('pedir')}
          >
            🏥 Reportar necesidad
          </button>
        </nav>

        {tab === 'pedir' ? <NeedForm onPublished={() => setTab('ver')} /> : <NeedsList />}

        <footer className="note">
          Desarrollada por Andrés Gil, 26/6/2026 - 0412-6127323
        </footer>
      </div>
    </>
  )
}