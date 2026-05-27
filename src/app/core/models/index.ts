// src/app/core/models/index.ts

export type Fase = 'grupos' | 'octavos' | 'cuartos' | 'semifinal' | 'tercer_puesto' | 'final';
export type EstadoPartido = 'pendiente' | 'en_juego' | 'finalizado';

export interface Usuario {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  rol: 'user' | 'admin';
  puntos_total: number;
  created_at: string;
}

export interface Partido {
  match_number: number;
  fase: Fase;
  grupo: string | null;
  equipo_local: string;
  equipo_visitante: string;
  estadio: string;
  ciudad: string;
  date_dt: string;
  goles_local: number | null;
  goles_visitante: number | null;
  estado: EstadoPartido;
}

export interface Apuesta {
  id: string;
  user_id: string;
  partido_id: number;
  goles_local: number;
  goles_visitante: number;
  puntos_obtenidos: number | null;
  created_at: string;
}

export interface ClasificacionRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  puntos_total: number;
  exactos: number;
  diferencias: number;
  ganadores: number;
  fallos: number;
  partidos_jugados: number;
  posicion: number;
}

export const FASES_GRUPOS: Fase[] = ['grupos'];
export const FASES_TORNEO: Fase[] = ['octavos', 'cuartos', 'semifinal', 'tercer_puesto', 'final'];

export const NOMBRE_FASE: Record<Fase, string> = {
  grupos:        'Fase de Grupos',
  octavos:       'Octavos de Final',
  cuartos:       'Cuartos de Final',
  semifinal:     'Semifinales',
  tercer_puesto: '3er y 4º Puesto',
  final:         'Gran Final',
};

export const BANDERAS: Record<string, string> = {
  'México': '🇲🇽', 'Canadá': '🇨🇦', 'Argentina': '🇦🇷',
  'Brasil': '🇧🇷', 'España': '🇪🇸', 'Francia': '🇫🇷',
  'Alemania': '🇩🇪', 'Portugal': '🇵🇹', 'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Países Bajos': '🇳🇱', 'Croacia': '🇭🇷', 'Bélgica': '🇧🇪',
  'Uruguay': '🇺🇾', 'Japón': '🇯🇵', 'Marruecos': '🇲🇦',
  'Islandia': '🇮🇸', 'Ecuador': '🇪🇨', 'Arabia Saudí': '🇸🇦',
  'Irán': '🇮🇷', 'Serbia': '🇷🇸',
};

export function bandera(equipo: string): string {
  return BANDERAS[equipo] ?? '🏳️';
}

export function partidoBloqueado(partido: Partido): boolean {
  return new Date(partido.date_dt) <= new Date();
}
