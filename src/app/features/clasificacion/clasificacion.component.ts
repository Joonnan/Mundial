// src/app/features/clasificacion/clasificacion.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { PartidosService } from '../../core/services/partidos.service';
import { ClasificacionRow, Partido } from '../../core/models';

// ── Modelo interno para la tabla de grupos ──────────────────
interface EquipoGrupo {
  nombre: string;
  pj: number;   // Partidos jugados
  g:  number;   // Ganados
  e:  number;   // Empates
  p:  number;   // Perdidos
  gf: number;   // Goles a favor
  gc: number;   // Goles en contra
  dg: number;   // Diferencia de goles
  pts: number;  // Puntos
}

interface GrupoData {
  nombre: string;         // "Grupo A", "Grupo B", ...
  equipos: EquipoGrupo[];
  partidos: Partido[];
}

type Vista = 'porra' | 'grupos';

@Component({
  selector: 'app-clasificacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './clasificacion.component.html',
  styleUrl: './clasificacion.component.scss'
})
export class ClasificacionComponent implements OnInit {
  private svc = inject(PartidosService);
  auth        = inject(AuthService);

  loading   = signal(true);
  rows      = signal<ClasificacionRow[]>([]);
  partidos  = signal<Partido[]>([]);
  vistaActual      = signal<Vista>('porra');
  grupoSeleccionado = signal<string>('todos');

  // ── Porra ──────────────────────────────────────────────────
  top3 = computed(() => this.rows().slice(0, 3));

  podio = computed(() => {
    const t = this.top3();
    if (t.length < 3) return t;
    return [t[1], t[0], t[2]];
  });

  miPosicion = computed(() =>
    this.rows().find(r => r.id === this.auth.usuario()?.id)
  );

  // ── Grupos ─────────────────────────────────────────────────
  gruposData = computed((): GrupoData[] => {
    const partidosGrupo = this.partidos().filter(p => p.fase === 'grupos');
    if (partidosGrupo.length === 0) return [];

    // Recoger grupos únicos
    const gruposUnicos = [...new Set(partidosGrupo.map(p => p.grupo ?? '?'))].sort();

    return gruposUnicos.map(g => {
      const pGroup = partidosGrupo.filter(p => p.grupo === g);
      const equiposSet = new Set<string>();
      pGroup.forEach(p => {
        equiposSet.add(p.equipo_local);
        equiposSet.add(p.equipo_visitante);
      });

      const equiposMap: Record<string, EquipoGrupo> = {};
      [...equiposSet].forEach(nombre => {
        equiposMap[nombre] = { nombre, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0 };
      });

      // Calcular stats solo de partidos finalizados
      pGroup.filter(p => p.estado === 'finalizado').forEach(p => {
        const gl = p.goles_local   ?? 0;
        const gv = p.goles_visitante ?? 0;
        const local    = equiposMap[p.equipo_local];
        const visitante= equiposMap[p.equipo_visitante];
        if (!local || !visitante) return;

        local.pj++;     visitante.pj++;
        local.gf  += gl; local.gc  += gv; local.dg  = local.gf  - local.gc;
        visitante.gf += gv; visitante.gc += gl; visitante.dg = visitante.gf - visitante.gc;

        if (gl > gv) {
          local.g++;    local.pts    += 3;
          visitante.p++;
        } else if (gl < gv) {
          visitante.g++; visitante.pts += 3;
          local.p++;
        } else {
          local.e++;    local.pts    += 1;
          visitante.e++; visitante.pts += 1;
        }
      });

      // Ordenar: puntos → DG → GF → nombre
      const equipos = Object.values(equiposMap).sort((a, b) => {
        if (b.pts !== a.pts)  return b.pts - a.pts;
        if (b.dg  !== a.dg)   return b.dg  - a.dg;
        if (b.gf  !== a.gf)   return b.gf  - a.gf;
        return a.nombre.localeCompare(b.nombre);
      });

      return {
        nombre:   `Grupo ${g}`,
        equipos,
        partidos: pGroup,
      };
    });
  });

  gruposDisponibles = computed(() =>
    this.gruposData().map(g => g.nombre)
  );

  gruposMostrar = computed(() => {
    const sel = this.grupoSeleccionado();
    if (sel === 'todos') return this.gruposData();
    return this.gruposData().filter(g => g.nombre === sel);
  });

  // ── Lifecycle ──────────────────────────────────────────────
  async ngOnInit() {
    const [clasiData, partidosData] = await Promise.all([
      this.svc.getClasificacion(),
      this.svc.getPartidos(),
    ]);
    this.rows.set(clasiData);
    this.partidos.set(partidosData);
    this.loading.set(false);
  }

  // ── Helpers porra ──────────────────────────────────────────
  inicial(r: ClasificacionRow): string {
    return (r.display_name || r.username || '?').charAt(0).toUpperCase();
  }

  medalla(pos: number): string {
    return ['🥇', '🥈', '🥉'][pos - 1] ?? `#${pos}`;
  }

  podioAltura(r: ClasificacionRow): number {
    return ({ 1: 130, 2: 100, 3: 80 } as Record<number, number>)[r.posicion] ?? 80;
  }

  esMio(r: ClasificacionRow): boolean {
    return r.id === this.auth.usuario()?.id;
  }
  trackByRow(_: number, r: ClasificacionRow) { return r.id; }

  // ── Helpers grupos ─────────────────────────────────────────
  setVista(v: Vista)   { this.vistaActual.set(v); }
  setGrupo(g: string)  { this.grupoSeleccionado.set(g); }

  isRealTeam(name: string): boolean {
    if (!name) return false;
    const n = name.toLowerCase();
    return !n.includes('match') && !n.includes('/') && !n.includes('winner') && !n.includes('loser');
  }

  getFlagUrl(teamName: string): string {
    const map: Record<string, string> = {
      'mexico': 'mx', 'south africa': 'za', 'korea republic': 'kr',
      'canada': 'ca', 'usa': 'us', 'paraguay': 'py', 'haiti': 'ht',
      'scotland': 'gb-sct', 'australia': 'au', 'brazil': 'br',
      'morocco': 'ma', 'qatar': 'qa', 'switzerland': 'ch',
      "côte d'ivoire": 'ci', "cote d'ivoire": 'ci',
      'argentina': 'ar', 'spain': 'es', 'france': 'fr', 'germany': 'de',
      'italy': 'it', 'england': 'gb-eng', 'japan': 'jp', 'portugal': 'pt',
      'netherlands': 'nl', 'belgium': 'be', 'croatia': 'hr', 'denmark': 'dk',
      'senegal': 'sn', 'poland': 'pl', 'uruguay': 'uy', 'ecuador': 'ec',
      'iran': 'ir', 'ghana': 'gh', 'serbia': 'rs', 'cameroon': 'cm',
      'tunisia': 'tn', 'wales': 'gb-wls', 'costa rica': 'cr', 'saudi arabia': 'sa',
      'united states': 'us', 'new zealand': 'nz', 'nigeria': 'ng',
      'colombia': 'co', 'peru': 'pe', 'venezuela': 've', 'chile': 'cl',
      'bolivia': 'bo', 'honduras': 'hn', 'guatemala': 'gt', 'jamaica': 'jm',
      'panama': 'pa', 'el salvador': 'sv', 'trinidad and tobago': 'tt',
      'cuba': 'cu', 'turkey': 'tr', 'ukraine': 'ua', 'austria': 'at',
      'sweden': 'se', 'norway': 'no', 'finland': 'fi', 'czech republic': 'cz',
      'slovakia': 'sk', 'hungary': 'hu', 'romania': 'ro', 'greece': 'gr',
      'albania': 'al', 'slovenia': 'si', 'north macedonia': 'mk',
      'iceland': 'is', 'ireland': 'ie', 'russia': 'ru',
      'china': 'cn', 'india': 'in', 'indonesia': 'id', 'thailand': 'th',
      'vietnam': 'vn', 'philippines': 'ph', 'malaysia': 'my',
      'cameroun': 'cm', 'egypt': 'eg', 'algeria': 'dz', 'mali': 'ml',
    };
    const code = map[teamName.trim().toLowerCase()] || 'un';
    return `https://flagcdn.com/w40/${code}.png`;
  }
}