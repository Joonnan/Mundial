// src/app/features/clasificacion/clasificacion.component.ts
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { PartidosService } from '../../core/services/partidos.service';
import { ClasificacionRow } from '../../core/models';

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

  loading = signal(true);
  rows    = signal<ClasificacionRow[]>([]);

  top3 = computed(() => this.rows().slice(0, 3));
  resto= computed(() => this.rows().slice(3));

  // Podio ordenado visualmente: 2º - 1º - 3º
  podio = computed(() => {
    const t = this.top3();
    if (t.length < 3) return t;
    return [t[1], t[0], t[2]];
  });

  miPosicion = computed(() =>
    this.rows().find(r => r.id === this.auth.usuario()?.id)
  );

  async ngOnInit() {
    const data = await this.svc.getClasificacion();
    this.rows.set(data);
    this.loading.set(false);
  }

  inicial(r: ClasificacionRow): string {
    return (r.display_name || r.username || '?').charAt(0).toUpperCase();
  }

  medalla(pos: number): string {
    return ['🥇','🥈','🥉'][pos - 1] ?? `#${pos}`;
  }

  podioAltura(r: ClasificacionRow): number {
    const map: Record<number, number> = { 1: 130, 2: 100, 3: 80 };
    return map[r.posicion] ?? 80;
  }

  esMio(r: ClasificacionRow): boolean {
    return r.id === this.auth.usuario()?.id;
  }

  trackByRow(_: number, r: ClasificacionRow) { return r.id; }
}
