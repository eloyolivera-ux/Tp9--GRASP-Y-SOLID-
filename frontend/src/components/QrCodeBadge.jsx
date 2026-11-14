import React from 'react';

// Generador visual de patrón tipo QR con estilo moderno
export default function QrCodeBadge({ code, size = 120 }) {
  // Genera una matriz pseudo-aleatoria consistente basada en el string
  const hash = code ? code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 42;
  const grid = 9;
  const cells = [];

  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      // Posición de los 3 ojos del QR (esquinas superior-izq, superior-der, inferior-izq)
      const isTopLeft = r < 3 && c < 3;
      const isTopRight = r < 3 && c > grid - 4;
      const isBottomLeft = r > grid - 4 && c < 3;

      let isFilled = false;
      if (isTopLeft || isTopRight || isBottomLeft) {
        // Marco y centro del ojo
        const edge = (r === 0 || r === 2 || c === 0 || c === 2) ||
                     (r === 0 || r === 2 || c === grid - 1 || c === grid - 3) ||
                     (r === grid - 1 || r === grid - 3 || c === 0 || c === 2);
        const center = (r === 1 && c === 1) ||
                       (r === 1 && c === grid - 2) ||
                       (r === grid - 2 && c === 1);
        isFilled = edge || center;
      } else {
        // Datos basados en hash
        isFilled = ((r * 7 + c * 13 + hash) % 3 === 0) || ((r + c + hash) % 5 === 0);
      }

      if (isFilled) {
        cells.push({ r, c });
      }
    }
  }

  const cellSize = size / grid;

  return (
    <div className="qr-badge-wrapper" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <rect width={size} height={size} rx="8" fill="#0c1017" stroke="#243042" strokeWidth="1.5" />
        {cells.map((cell, idx) => (
          <rect
            key={idx}
            x={cell.c * cellSize + 2}
            y={cell.r * cellSize + 2}
            width={cellSize - 1.5}
            height={cellSize - 1.5}
            rx="1.5"
            fill="#38bdf8"
          />
        ))}
      </svg>
    </div>
  );
}

