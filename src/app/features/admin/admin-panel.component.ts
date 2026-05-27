// src/app/features/admin/admin-panel.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { PartidosService } from '../../core/services/partidos.service';
import { Partido, NOMBRE_FASE, bandera, Fase } from '../../core/models';

interface PartidoAdmin extends Partido {
  editando: boolean;
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

  // ── Stats ──────────────────────────────────────────────────
  stats = computed(() => {
    const list = this.partidos();
    return {
      total:       list.length,
      finalizados: list.filter(p => p.estado === 'finalizado').length,
      pendientes:  list.filter(p => p.estado === 'pendiente').length,
      enJuego:     list.filter(p => p.estado === 'en_juego').length,
    };
  });

  // ── Partidos filtrados ─────────────────────────────────────
  filtrados = computed(() => {
    const q   = this.busqueda().toLowerCase();
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

  // ── Agrupados por fase ─────────────────────────────────────
  agrupados = computed(() => {
    const map: Record<string, PartidoAdmin[]> = {};
    for (const p of this.filtrados()) {
      const key = p.fase === 'grupos'
        ? `Grupo ${p.grupo ?? '?'}`
        : NOMBRE_FASE[p.fase];
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
    const raw = await this.svc.getPartidos();
    this.partidos.set(raw.map(p => ({
      ...p,
      editando:       false,
      draftLocal:     p.goles_local?.toString()      ?? '',
      draftVisitante: p.goles_visitante?.toString()  ?? '',
      saving:         false,
    })));
    this.loading.set(false);
  }

  bandera = bandera;
  NOMBRE_FASE = NOMBRE_FASE;

  formatFecha(dt: string): string {
    return new Date(dt).toLocaleString('es-ES', {
      day: '2-digit', month: 'short', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }

  abrirEdicion(p: PartidoAdmin) {
    // Cerrar todos los demás
    this.partidos.update(list =>
      list.map(x => x.match_number === p.match_number
        ? { ...x, editando: true, draftLocal: x.goles_local?.toString() ?? '', draftVisitante: x.goles_visitante?.toString() ?? '' }
        : { ...x, editando: false }
      )
    );
  }

  cancelarEdicion(id: number) {
    this.updatePartido(id, { editando: false });
  }

  async guardarMarcador(p: PartidoAdmin) {
    const gl = parseInt(p.draftLocal);
    const gv = parseInt(p.draftVisitante);
    if (isNaN(gl) || isNaN(gv) || gl < 0 || gv < 0) {
      this.showGlobalMsg('Introduce marcadores válidos (números ≥ 0)', false);
      return;
    }
    this.updatePartido(p.match_number, { saving: true });
    const err = await this.svc.actualizarMarcador(p.match_number, gl, gv);
    this.updatePartido(p.match_number, { saving: false });

    if (err) {
      this.showGlobalMsg(`Error: ${err}`, false);
    } else {
      this.updatePartido(p.match_number, { editando: false });
      this.showGlobalMsg(
        `✓ Partido #${p.match_number} finalizado. Puntos calculados automáticamente vía trigger SQL.`,
        true
      );
      await this.loadPartidos();
    }
  }

  async reabrir(p: PartidoAdmin) {
    if (!confirm(`¿Reabrir partido #${p.match_number}? Se anularán los puntos asignados y se recalcularán al volver a guardar.`)) return;
    this.updatePartido(p.match_number, { saving: true });
    const err = await this.svc.reabrirPartido(p.match_number);
    this.updatePartido(p.match_number, { saving: false });

    if (err) {
      this.showGlobalMsg(`Error: ${err}`, false);
    } else {
      this.showGlobalMsg(`Partido #${p.match_number} reabierto correctamente.`, true);
      await this.loadPartidos();
    }
  }

  private showGlobalMsg(text: string, ok: boolean) {
    this.globalMsg.set({ text, ok });
    setTimeout(() => this.globalMsg.set(null), 6000);
  }

  private updatePartido(id: number, patch: Partial<PartidoAdmin>) {
    this.partidos.update(list =>
      list.map(p => p.match_number === id ? { ...p, ...patch } : p)
    );
  }

  setBusqueda(v: string) { this.busqueda.set(v); }
  setFiltro(v: FiltroEstado) { this.filtroEstado.set(v); }
  trackByPartido(_: number, p: PartidoAdmin) { return p.match_number; }
  trackByFase   (_: number, k: string)       { return k; }
}
