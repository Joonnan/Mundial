// src/app/features/admin/admin-panel.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { PartidosService } from '../../core/services/partidos.service';
import { Partido, NOMBRE_FASE, bandera } from '../../core/models';

interface PartidoAdmin extends Partido {
  draftLocal: string;
  draftVisitante: string;
  saving: boolean;
}

type FiltroEstado = 'todos' | 'pendiente' | 'finalizado';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.scss'
})
export class AdminPanelComponent implements OnInit {
  private svc = inject(PartidosService);
  auth        = inject(AuthService);

  loading       = signal(true);
  partidos      = signal<PartidoAdmin[]>([]);
  busqueda      = signal('');
  filtroEstado  = signal<FiltroEstado>('todos');
  globalMsg     = signal<{ text: string; ok: boolean } | null>(null);

  // ── Stats Globales Calculadas Automáticamente ────────────────────────────────
  stats = computed(() => {
    const list = this.partidos();
    return {
      total:       list.length,
      finalizados: list.filter(p => p.estado === 'finalizado').length,
      pendientes:  list.filter(p => p.estado === 'pendiente').length,
    };
  });

  // ── Filtros combinados de Búsqueda y Estados ─────────────────────────────
  filtrados = computed(() => {
    const q   = this.busqueda().toLowerCase().trim();
    const est = this.filtroEstado();
    
    return this.partidos().filter(p => {
      const matchQ = !q
        || p.equipo_local.toLowerCase().includes(q)
        || p.equipo_visitante.toLowerCase().includes(q)
        || String(p.match_number).includes(q)
        || p.estadio.toLowerCase().includes(q);
        
      const matchE = est === 'todos' || p.estado === est;
      return matchQ && matchE;
    });
  });

  // ── Agrupación por fases (Estructura de Datos Limpia) ─────────────────────────────
  agrupados = computed(() => {
    const map: Record<string, PartidoAdmin[]> = {};
    for (const p of this.filtrados()) {
      const key = p.fase === 'grupos'
        ? `Grupo ${p.grupo ?? '?'}`
        : NOMBRE_FASE[p.fase] || p.fase;
      if (!map[key]) map[key] = [];
      map[key].push(p);
    }
    return map;
  });

  fasesKeys = computed(() => Object.keys(this.agrupados()));

  async ngOnInit() {
    await this.loadPartidos();
  }

  async loadPartidos() {
    this.loading.set(true);
    try {
      const raw = await this.svc.getPartidos();
      this.partidos.set(raw.map(p => ({
        ...p,
        draftLocal:     p.goles_local !== null && p.goles_local !== undefined ? p.goles_local.toString() : '',
        draftVisitante: p.goles_visitante !== null && p.goles_visitante !== undefined ? p.goles_visitante.toString() : '',
        saving:         false,
      })));
    } catch (e) {
      this.showGlobalMsg('Error al conectar con el servidor', false);
    } finally {
      this.loading.set(false);
    }
  }

  bandera = bandera;

  formatFecha(dt: string): string {
    return new Date(dt).toLocaleString('es-ES', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  // ── Guardar Marcador Directo ───────────────────────────────────────────
  async guardarMarcador(p: PartidoAdmin) {
    const gl = parseInt(p.draftLocal, 10);
    const gv = parseInt(p.draftVisitante, 10);

    if (isNaN(gl) || isNaN(gv) || gl < 0 || gv < 0) {
      this.showGlobalMsg('Introduce marcadores válidos (números ≥ 0)', false);
      return;
    }

    this.updatePartidoState(p.match_number, { saving: true });
    const err = await this.svc.actualizarMarcador(p.match_number, gl, gv);

    if (err) {
      this.showGlobalMsg(`Error: ${err}`, false);
      this.updatePartidoState(p.match_number, { saving: false });
    } else {
      this.showGlobalMsg(`✓ Partido #${p.match_number} guardado. Puntos recalculados en DB.`, true);
      // Actualizamos localmente el estado sin necesidad de refrescar todo el HTTP si el backend responde OK
      this.updatePartidoState(p.match_number, { 
        saving: false, 
        estado: 'finalizado',
        goles_local: gl,
        goles_visitante: gv 
      });
      // Descomenta la siguiente línea si necesitas recargar obligatoriamente los datos actualizados por BD:
      await this.loadPartidos();
    }
  }

  // ── Reabrir Partido para Edición ───────────────────────────────────────────
  async reabrir(p: PartidoAdmin) {
    const seguro = confirm(`¿Reabrir partido #${p.match_number}? Se anularán temporalmente los puntos asignados.`);
    if (!seguro) return;

    this.updatePartidoState(p.match_number, { saving: true });
    const err = await this.svc.reabrirPartido(p.match_number);

    if (err) {
      this.showGlobalMsg(`Error al reabrir: ${err}`, false);
      this.updatePartidoState(p.match_number, { saving: false });
    } else {
      this.showGlobalMsg(`Partido #${p.match_number} reabierto. Ya puedes modificar el marcador.`, true);
      await this.loadPartidos();
    }
  }

  private showGlobalMsg(text: string, ok: boolean) {
    this.globalMsg.set({ text, ok });
    setTimeout(() => this.globalMsg.set(null), 4000);
  }

  private updatePartidoState(id: number, patch: Partial<PartidoAdmin>) {
    this.partidos.update(list =>
      list.map(p => p.match_number === id ? { ...p, ...patch } : p)
    );
  }

  setBusqueda(v: string) { this.busqueda.set(v); }
  setFiltro(v: FiltroEstado) { this.filtroEstado.set(v); }
  trackByPartido(_: number, p: PartidoAdmin) { return p.match_number; }
  trackByFase   (_: number, k: string)       { return k; }
}