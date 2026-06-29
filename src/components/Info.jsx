export default function Info() {
  return (
    <div className="panel">
      <h2>¿Cómo usar esta plataforma?</h2>
      <p className="sub">
        Conecta a quienes necesitan insumos médicos con quienes pueden conseguirlos y entregarlos. Así puedes participar según tu rol.
      </p>

      <div className="info-block">
        <h3>Personal médico</h3>
        <p>
          Regístrate con el código de tu hospital y publica los insumos que hacen falta, indicando la urgencia de cada uno. Los centros de acopio verán tu solicitud en tiempo real y coordinarán la entrega contigo.
        </p>
      </div>

      <div className="info-block">
        <h3>Centros de acopio</h3>
        <p>
          Inicia sesión con tu correo y revisa las necesidades registradas, agrupadas por hospital. Marca los insumos que vas a llevar para que otros voluntarios no dupliquen el esfuerzo, y márcalos como entregados cuando completes la entrega.
        </p>
      </div>

      <div className="info-block">
        <h3>Voluntarios y albergues</h3>
        <p>
          Puedes consultar el reporte sin iniciar sesión para ver qué insumos hacen falta y en qué hospitales, y coordinar con los centros de acopio listados para llevar ayuda donde más se necesita.
        </p>
      </div>
    </div>
  )
}