export default function Info() {
  return (
    <div className="panel">
      <h2>¿Cómo usar esta plataforma?</h2>
      <p className="sub">
        Conecta a quienes necesitan insumos médicos con quienes pueden conseguirlos y entregarlos. Así puedes participar según tu rol.
      </p>

      <div className="info-block">
        <h3>Solicitud de insumos en Centros de Acopio UCV</h3>
        <p style={{ textAlign: 'justify' }}>Para centros de salud, organizaciones de salud y albergues.</p>
        <p style={{ textAlign: 'justify' }}>
          Para hacer entrega de cajas con insumos y medicamentos en Centros de Acopio de la UCV se deben seguir los siguientes pasos:
        </p>
        <ol style={{ margin: '0 0 12px 18px', padding: 0, color: '#444', fontSize: '.92rem', lineHeight: 1.5, textAlign: 'justify' }}>
          <li>
            Regístrate en esta página, colocando tus datos y en "código de acceso", coloca el correspondiente según el hospital, centro de salud u organización a la que pertenezcas. (Los códigos los otorgamos personalmente, a través de los números más abajo).
          </li>
          <li>
            Una vez que ingreses a la página, haz click en "Hacer Solicitud de Donación" y completa los datos. Es importante agregar el servicio al que será dirigido y los datos de la persona que recibirá en el centro. Luego, llena cada ítem solicitado por separado y agrega cualquier nota adicional que consideres necesaria.
          </li>
          <li>
            Al recibir la solicitud, verificaremos disponibilidad y armaremos la caja. Nos pondremos en contacto con el número indicado para coordinar la entrega. Podemos llevarla al centro correspondiente.
          </li>
        </ol>

        <p style={{ marginBottom: 4 }}><b>Ubicación de los centros de acopio:</b></p>
        <p style={{ margin: '0 0 12px' }}>
          <b>Instituto Anatómico UCV:</b>{' '}
          <a href="https://maps.app.goo.gl/Lyv7eekSS9BisZb97?g_st=ic" target="_blank" rel="noopener noreferrer">
            ver ubicación
          </a>
          <br />
          <b>Instituto de Medicina Tropical UCV:</b>{' '}
          <a href="https://maps.app.goo.gl/bpRg9A67H8Lbur3bA?g_st=ic" target="_blank" rel="noopener noreferrer">
            ver ubicación
          </a>
        </p>

        <p style={{ textAlign: 'justify' }}>
          Debemos proteger los insumos y medicamentos que las personas nos confían, para que lleguen a las manos de quienes los necesitan.
        </p>
        <p style={{ textAlign: 'justify' }}>
          Si formas parte de un hospital, centro de salud u organización, puedes escribirnos para que te enviemos el código correspondiente y así puedas hacer la solicitud.
        </p>
        <p style={{ textAlign: 'justify' }}>
          Personal de salud que planea ir a apoyar directamente en terreno y requiere insumos puede contactarnos para verificar su identidad y entregarle insumos como puesto de salud espontáneo.
        </p>
        <br></br>
        <p style={{ marginBottom: 0 }}>
          <b>Número de contacto:</b><br />
          <b style={{ fontSize: '1.05rem', color: '#7c5ffe' }}>Manuela Saglimbeni: +58 424-2838548</b><br />
          <b style={{ fontSize: '1.05rem', color: '#7c5ffe' }}>María Alesia Rafalli: +58 414-3003224</b>
        </p>
      </div>
    </div>
  )
}