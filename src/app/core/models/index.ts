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

export const BANDERAS: Record<string, string> = {    // ── PAÍSES REALES ─────────────────────────────────
    'algeria': 'dz',
    'argentina': 'ar',
    'australia': 'au',
    'austria': 'at',
    'belgium': 'be',
    'brazil': 'br',
    'cabo verde': 'cv',
    'canada': 'ca',
    'colombia': 'co',
    'croatia': 'hr',
    'curaçao': 'cw',
    "côte d'ivoire": 'ci',
    'ecuador': 'ec',           // ¡Añadido!
    'egypt': 'eg',
    'england': 'gb-eng',
    'france': 'fr',
    'germany': 'de',
    'ghana': 'gh',
    'haiti': 'ht',
    'ir iran': 'ir',
    'japan': 'jp',
    'jordan': 'jo',
    'korea republic': 'kr',
    'mexico': 'mx',
    'morocco': 'ma',
    'netherlands': 'nl',
    'new zealand': 'nz',
    'norway': 'no',
    'panama': 'pa',
    'paraguay': 'py',
    'portugal': 'pt',
    'qatar': 'qa',
    'saudi arabia': 'sa',
    'scotland': 'gb-sct',
    'senegal': 'sn',
    'south africa': 'za',
    'spain': 'es',
    'switzerland': 'ch',
    'tunisia': 'tn',
    'usa': 'us',
    'uruguay': 'uy',
    'uzbekistan': 'uz'
};

export function bandera(equipo: string | null | undefined): string {
  if (!equipo) return 'https://flagcdn.com/w40/un.png';
  
  const clean = equipo.toLowerCase().trim();

  // 1. Si es un país real mapeado, devolvemos su bandera oficial de FlagCDN
  if (BANDERAS[clean]) {
    return `https://flagcdn.com/w40/${BANDERAS[clean]}.png`;
  }

  // 2. Control especial para Play-offs/Repechajes (ej: "Albania/Poland")
  // o textos de eliminatorias futuras (ej: "Winner match 73")
  if (clean.includes('/') || clean.includes('winner') || clean.includes('group')) {
    return 'https://flagcdn.com/w40/un.png';
  }

  // 3. Fallback general por si no coincide nada
  return 'https://flagcdn.com/w40/un.png';
}

export function partidoBloqueado(partido: Partido): boolean {
  return new Date(partido.date_dt) <= new Date();
}
