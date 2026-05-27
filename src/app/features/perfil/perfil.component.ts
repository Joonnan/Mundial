// src/app/features/perfil/perfil.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { PartidosService } from '../../core/services/partidos.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { Apuesta, Partido, bandera } from '../../core/models';

interface ApuestaDetalle extends Apuesta {
  partido?: Partido;
}

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss'
})
export class PerfilComponent implements OnInit {
  auth       = inject(AuthService);
  private svc  = inject(PartidosService);
  private supa = inject(SupabaseService).client;

  loading        = signal(true);
  apuestas       = signal<ApuestaDetalle[]>([]);
  editNombre     = signal(false);
  draftNombre    = signal('');
  savingNombre   = signal(false);
  msgNombre      = signal<{ text: string; ok: boolean } | null>(null);

  // ── Estadísticas personales ────────────────────────────────
  stats = computed(() => {
    const list = this.apuestas();
    const res  = list.filter(a => a.puntos_obtenidos !== null);
    return {
      total:       list.length,
      jugados:     res.length,
      pendientes:  list.length - res.length,
      exactos:     res.filter(a => a.puntos_obtenidos === 5).length,
      diferencias: res.filter(a => a.puntos_obtenidos === 3).length,
      ganadores:   res.filter(a => a.puntos_obtenidos === 1).length,
      fallos:      res.filter(a => a.puntos_obtenidos === 0).length,
      puntosTotal: this.auth.usuario()?.puntos_total ?? 0,
      precision:   res.length > 0
        ? Math.round((res.filter(a => (a.puntos_obtenidos ?? 0) > 0).length / res.length) * 100)
        : 0,
    };
  });

  // Últimas 5 apuestas resueltas
  ultimas = computed(() =>
    this.apuestas()
      .filter(a => a.puntos_obtenidos !== null)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
  );

  bandera = bandera;

  async ngOnInit() {
    await this.loadApuestas();
  }

  async loadApuestas() {
    this.loading.set(true);
    const uid = this.auth.usuario()?.id;
    if (!uid) { this.loading.set(false); return; }

    const [rawApuestas, rawPartidos] = await Promise.all([
      this.svc.getApuestasUsuario(uid),
      this.svc.getPartidos(),
    ]);

    const pMap: Record<number, Partido> = {};
    for (const p of rawPartidos) pMap[p.match_number] = p;

    this.apuestas.set(rawApuestas.map(a => ({ ...a, partido: pMap[a.partido_id] })));
    this.loading.set(false);
  }

  iniciarEditNombre() {
    this.draftNombre.set(this.auth.usuario()?.display_name ?? '');
    this.editNombre.set(true);
    this.msgNombre.set(null);
  }

  cancelarEditNombre() {
    this.editNombre.set(false);
    this.msgNombre.set(null);
  }

  async guardarNombre() {
    const nombre = this.draftNombre().trim();
    if (!nombre || nombre.length < 2) {
      this.msgNombre.set({ text: 'Mínimo 2 caracteres', ok: false });
      return;
    }
    this.savingNombre.set(true);
    const uid = this.auth.usuario()?.id;
    const { error } = await this.supa
      .from('usuarios')
      .update({ display_name: nombre })
      .eq('id', uid);
    this.savingNombre.set(false);

    if (error) {
      this.msgNombre.set({ text: error.message, ok: false });
    } else {
      this.editNombre.set(false);
      this.msgNombre.set({ text: '✓ Nombre actualizado', ok: true });
      // Refrescar usuario en el signal
      const { data } = await this.supa.from('usuarios').select('*').eq('id', uid).single();
      if (data) this.auth.usuario.set(data);
      setTimeout(() => this.msgNombre.set(null), 3000);
    }
  }

  inicial(): string {
    const u = this.auth.usuario();
    return (u?.display_name || u?.username || '?').charAt(0).toUpperCase();
  }

  ptsClass(pts: number | null): string {
    if (pts === null) return 'pts-pending';
    return `pts-${pts}`;
  }

  ptsIcon(pts: number | null): string {
    const m: Record<number, string> = { 5: '🎯', 3: '✅', 1: '👍', 0: '❌' };
    return pts !== null ? (m[pts] ?? '') : '⏳';
  }

  formatFecha(dt: string): string {
    return new Date(dt).toLocaleString('es-ES', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  }

  trackByApuesta(_: number, a: ApuestaDetalle) { return a.id; }
}
