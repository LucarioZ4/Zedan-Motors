import React from 'react';
import './ZedanLogo.css';

import carImg from '../../assets/01_carro.png';
import zedanImg from '../../assets/03_zedan_motors.png';
import tallerImg from '../../assets/04_taller_automotriz.png';

/**
 * Componente oficial del Logo de Zedan Motors
 * Ensambla de forma armónica las 3 piezas gráficas:
 *  1. Carro silueta deportiva (top)
 *  2. Badge contenedor "ZEDAN MOTORS" (centro)
 *  3. Subtítulo con líneas acento "TALLER AUTOMOTRIZ" (inferior)
 */
export default function ZedanLogo({
  variant = 'full', // 'full' | 'sidebar' | 'login' | 'hero' | 'compact'
  width,
  showSubtitle = true,
  className = '',
  onClick
}) {
  return (
    <div
      className={`zedan-logo-container zedan-logo-${variant} ${className}`}
      style={width ? { width: typeof width === 'number' ? `${width}px` : width } : {}}
      onClick={onClick}
    >
      {/* 1. Silueta de auto deportivo */}
      <div className="zedan-logo-car-wrap">
        <img
          src={carImg}
          alt="Zedan Motors Car Silhouette"
          className="zedan-logo-car"
          loading="eager"
        />
      </div>

      {/* 2. Badge ZEDAN MOTORS */}
      <div className="zedan-logo-badge-wrap">
        <img
          src={zedanImg}
          alt="Zedan Motors"
          className="zedan-logo-badge"
          loading="eager"
        />
      </div>

      {/* 3. Taller Automotriz (opcional) */}
      {showSubtitle && (
        <div className="zedan-logo-subtitle-wrap">
          <img
            src={tallerImg}
            alt="Taller Automotriz"
            className="zedan-logo-subtitle"
            loading="eager"
          />
        </div>
      )}
    </div>
  );
}
