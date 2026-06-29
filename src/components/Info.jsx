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
          Regístrate con el código de tu hospital y publica los insumos que hacen falta, indicando el servicio y la urgencia de cada uno. Cuando un insumo va avanzando (lista para salir, en camino), puedes confirmar su recepción una vez que llegue a tu hospital — solo para las necesidades de tu propio hospital.
        </p>
      </div>

      <div className="info-block">
        <h3>Centros de acopio</h3>
        <p>
          Inicia sesión con tu correo y revisa el reporte completo, ordenado del insumo más reciente al más antiguo. Marca los insumos que vas a llevar y ve avanzando su estado paso a paso (lista para salir → en camino → recibida) para que otros centros no dupliquen el esfuerzo.
        </p>
      </div>

      <div className="info-block">
        <h3>Fundaciones</h3>
        <p>
          Regístrate con el código de tu fundación. Puedes publicar necesidades en nombre de cualquier hospital del listado, y al igual que los centros de acopio, marcar y avanzar el estado de cualquier insumo del reporte.
        </p>
      </div>

      <div className="info-block">
        <h3>Estado de comida</h3>
        <p>
          En la sección "Comida" se reporta, por hospital, si hay alimentos perecederos y no perecederos disponibles. El personal médico de cada hospital (o un administrador) puede actualizar ese estado en cualquier momento.
        </p>
      </div>

      <div className="info-block">
        <h3>Voluntarios y albergues</h3>
        <p>
          Puedes consultar el reporte sin iniciar sesión para ver qué insumos hacen falta, en qué hospitales, y su estado actual, y coordinar con los centros de acopio o fundaciones listados para llevar ayuda donde más se necesita.
        </p>
      </div>
    </div>
  )
}