// Genera y descarga un archivo CSV en el navegador (client-side, sin dependencias).
// Incluye BOM UTF-8 para que Excel muestre correctamente los acentos.
export function descargarCSV(nombreArchivo, headers, filas) {
  const escapar = (v) => {
    const s = (v ?? '').toString()
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lineas = [headers, ...filas].map((fila) => fila.map(escapar).join(','))
  const contenido = '﻿' + lineas.join('\r\n') // BOM para que Excel lea acentos
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
