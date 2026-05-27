// src/app/features/partidos/partidos.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { PartidosService } from '../../core/services/partidos.service';
import {
  Partido, Apuesta,
  FASES_GRUPOS, FASES_TORNEO, NOMBRE_FASE,
  bandera, partidoBloqueado
} from '../../core/models';

type TabType = 'grupos' | 'torneo';

interface PartidoVM extends Partido {
  apuesta?: Apuesta;
  bloqueado: boolean;
  draftLocal: string;
  draftVisitante: string;
  saving: boolean;
  msg: { text: string; ok: boolean } | null;
}

@Component({
  selector: 'app-partidos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './partidos.component.html',
  styleUrl: './partidos.component.scss'
})
export class PartidosComponent implements OnInit {
  private svc  = inject(PartidosService);
  auth         = inject(AuthService);

  loading = signal(true);
  tab     = signal<TabType>('grupos');
  partidos= signal<PartidoVM[]>([]);

  // Grupos únicos para fase de grupos
  grupos = computed(() =>
    [...new Set(
      this.partidos()
        .filter(p => p.fase === 'grupos')
        .map(p => p.grupo ?? '?')
    )].sort()
  );

  // Fases para el torneo
  fasesTorneo = computed(() =>
    [...new Set(
      this.partidos()
        .filter(p => FASES_TORNEO.includes(p.fase))
        .map(p => p.fase)
    )]
  );

  // Partidos filtrados por tab activo
  partidosPorGrupo = computed(() => {
    if (this.tab() !== 'grupos') return {};
    const map: Record<string, PartidoVM[]> = {};
    for (const g of this.grupos()) {
      map[`Grupo ${g}`] = this.partidos().filter(p => p.grupo === g);
    }
    return map;
  });

  partidosPorFase = computed(() => {
    if (this.tab() !== 'torneo') return {};
    const map: Record<string, PartidoVM[]> = {};
    for (const f of this.fasesTorneo()) {
      map[NOMBRE_FASE[f]] = this.partidos().filter(p => p.fase === f);
    }
    return map;
  });

  agrupados = computed(() =>
    this.tab() === 'grupos' ? this.partidosPorGrupo() : this.partidosPorFase()
  );

  keys = computed(() => Object.keys(this.agrupados()));

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.loading.set(true);
    const uid = this.auth.usuario()?.id;
    const [rawPartidos, rawApuestas] = await Promise.all([
      this.svc.getPartidos(),
      uid ? this.svc.getApuestasUsuario(uid) : Promise.resolve([]),
    ]);

    const apuestaMap: Record<number, Apuesta> = {};
    for (const a of rawApuestas) apuestaMap[a.partido_id] = a;

    this.partidos.set(rawPartidos.map(p => ({
      ...p,
      apuesta:         apuestaMap[p.match_number],
      bloqueado:       partidoBloqueado(p),
      draftLocal:      apuestaMap[p.match_number]?.goles_local?.toString()    ?? '',
      draftVisitante:  apuestaMap[p.match_number]?.goles_visitante?.toString() ?? '',
      saving: false,
      msg:    null,
    })));
    this.loading.set(false);
  }

  setTab(t: TabType) { this.tab.set(t); }
  
// Verifica si es una selección real o un texto provisional (ej: Winner match / Repescas)
  isRealTeam(name: string): boolean {
    if (!name) return false;
    const n = name.toLowerCase();
    return !n.includes('match') && !n.includes('/') && !n.includes('winner') && !n.includes('loser');
  }

  // Devuelve la URL de la bandera basándose en el nombre de la selección
  getFlagUrl(teamName: string): string {
    const map: Record<string, string> = {
      'mexico': 'mx',
      'south africa': 'za',
      'korea republic': 'kr',
      'canada': 'ca',
      'usa': 'us',
      'paraguay': 'py',
      'haiti': 'ht',
      'scotland': 'gb-sct',
      'australia': 'au',
      'brazil': 'br',
      'morocco': 'ma',
      'qatar': 'qa',
      'switzerland': 'ch',
      "côte d'ivoire": 'ci',
      "cote d'ivoire": 'ci',
      'argentina': 'ar',
      'spain': 'es',
      'france': 'fr',
      'germany': 'de',
      'italy': 'it',
      'england': 'gb-eng',
      'japan': 'jp',
      'portugal': 'pt',
      'netherlands': 'nl'
    };

    const code = map[teamName.trim().toLowerCase()] || 'un'; // 'un' muestra la bandera de la ONU por defecto
    return `https://flagcdn.com/w160/${code}.png`; // Tamaño óptimo para pantallas de alta densidad
  }

  bandera = bandera;

  formatFecha(dt: string): string {
    return new Date(dt).toLocaleString('es-ES', {
      weekday: 'short', day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit'
    });
  }

  ptsClass(pts: number | null | undefined): string {
    if (pts === null || pts === undefined) return 'pts-pending';
    return `pts-${pts}`;
  }

  ptsIcon(pts: number | null | undefined): string {
    const m: Record<number, string> = { 5: '🎯', 3: '✅', 1: '👍', 0: '❌' };
    return pts !== null && pts !== undefined ? (m[pts] ?? '') : '⏳';
  }

  async guardar(p: PartidoVM) {
    const uid = this.auth.usuario()?.id;
    if (!uid) return;

    if (p.bloqueado) {
      this.setMsg(p, '⏰ Partido bloqueado, ya no se pueden modificar apuestas', false);
      return;
    }

    const local     = parseInt(p.draftLocal);
    const visitante = parseInt(p.draftVisitante);
    if (isNaN(local) || isNaN(visitante) || local < 0 || visitante < 0) {
      this.setMsg(p, 'Introduce marcadores válidos (≥ 0)', false);
      return;
    }

    this.updatePartido(p.match_number, { saving: true });
    const err = await this.svc.upsertApuesta(uid, p.match_number, local, visitante);
    this.updatePartido(p.match_number, { saving: false });

    if (err) {
      this.setMsg(p, err, false);
    } else {
      this.setMsg(p, p.apuesta ? '✓ Apuesta actualizada' : '✓ Apuesta guardada', true);
      await this.loadData();
    }

    setTimeout(() => this.updatePartido(p.match_number, { msg: null }), 3000);
  }

  private setMsg(p: PartidoVM, text: string, ok: boolean) {
    this.updatePartido(p.match_number, { msg: { text, ok } });
  }

  private updatePartido(id: number, patch: Partial<PartidoVM>) {
    this.partidos.update(list =>
      list.map(p => p.match_number === id ? { ...p, ...patch } : p)
    );
  }

  trackByGrupo(_: number, key: string) { return key; }
  trackByPartido(_: number, p: PartidoVM) { return p.match_number; }
}
