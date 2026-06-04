export interface PrediccionPremio {
  id?: number;
  usuario_id: string;

  categoria:
    | 'bota_oro'
    | 'balon_oro'
    | 'guante_oro'
    | 'jugador_joven'
    | 'equipo_revelacion'
    | 'decepcion'
    | 'goleador_espana';

  prediccion: string;

  resultado_oficial?: string | null;

  puntos_obtenidos?: number | null;
}