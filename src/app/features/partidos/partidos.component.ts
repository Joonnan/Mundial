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

  // 1. MODIFICADO: Signals de Filtros
  searchQuery   = signal<string>('');   // Guarda el texto de búsqueda
  selectedGrupo = signal<string>('');   // NUEVO: Guarda el grupo seleccionado en el combo
  nombreFase    = NOMBRE_FASE;          // Expuesto para usarlo en el HTML mini-card

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

  // 2. MODIFICADO: Filtrado acumulativo reactivo (Combo + Buscador)
  partidosFiltrados = computed(() => {
    let list = this.partidos();

    // Filtro 1: Por Grupo (Combo)
    const grupoSeleccionado = this.selectedGrupo();
    if (grupoSeleccionado) {
      list = list.filter(p => p.grupo === grupoSeleccionado);
    }

    // Filtro 2: Por Texto (Buscador)
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      list = list.filter(p => 
        p.equipo_local.toLowerCase().includes(query) ||
        p.equipo_visitante.toLowerCase().includes(query) ||
        (p.grupo && p.grupo.toLowerCase().includes(query)) ||
        (p.grupo && `grupo ${p.grupo.toLowerCase()}`.includes(query))
      );
    }

    return list;
  });

  // 3. NUEVO: Carrusel con los próximos 6 partidos cronológicamente (que no hayan terminado)
  proximosPartidos = computed(() => {
    const ahora = new Date();
    return this.partidos()
      .filter(p => p.estado !== 'finalizado' && new Date(p.date_dt) >= ahora)
      .sort((a, b) => new Date(a.date_dt).getTime() - new Date(b.date_dt).getTime())
      .slice(0, 6); // Trae los siguientes 6 partidos (ajustable a 5 o 10 a tu gusto)
  });

  // 4. ACTUALIZADO: Ahora consumen 'partidosFiltrados()' en lugar de 'partidos()'
  partidosPorGrupo = computed(() => {
    if (this.tab() !== 'grupos') return {};
    const map: Record<string, PartidoVM[]> = {};
    const filtrados = this.partidosFiltrados();
    
    for (const g of this.grupos()) {
      const partidosDelGrupo = filtrados.filter(p => p.grupo === g);
      if (partidosDelGrupo.length > 0) { // Solo muestra el grupo si tiene partidos que coincidan
        map[`Grupo ${g}`] = partidosDelGrupo;
      }
    }
    return map;
  });

  partidosPorFase = computed(() => {
    if (this.tab() !== 'torneo') return {};
    const map: Record<string, PartidoVM[]> = {};
    const filtrados = this.partidosFiltrados();

    for (const f of this.fasesTorneo()) {
      const partidosDeLaFase = filtrados.filter(p => p.fase === f);
      if (partidosDeLaFase.length > 0) { // Solo muestra la fase si contiene coincidencias
        map[NOMBRE_FASE[f]] = partidosDeLaFase;
      }
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

setTab(t: TabType) { 
    this.tab.set(t); 
    this.selectedGrupo.set(''); // Resetea el combo
    this.searchQuery.set('');   // Resetea el buscador
  }  
// Verifica si es una selección real o un texto provisional (ej: Winner match / Repescas)
  isRealTeam(name: string): boolean {
    if (!name) return false;
    const n = name.toLowerCase();
    return !n.includes('match') && !n.includes('/') && !n.includes('winner') && !n.includes('loser');
  }

  // Devuelve la URL de la bandera basándose en el nombre de la selección
  getFlagUrl(teamName: string): string {
    const map: Record<string, string> = {
      
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
