import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PremiosService } from '../../core/services/premios.service'; 
import { AuthService } from '../../core/services/auth.service';       

interface Premio {
  id: string;
  titulo: string;
  icono: string;
  descripcion: string;
  valor: string;
  puntos: number; // <--- Puntos fijos asignados a la categoría
}

@Component({
  selector: 'app-premios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './premios.component.html',
  styleUrl: './premios.component.scss'
})
export class PremiosComponent implements OnInit {
  private svc = inject(PremiosService);
  private auth = inject(AuthService);

  guardando = signal(false);
  bloqueado = signal(false);

  // Hardcodeamos los puntos de tu tabla puntos_premios aquí
  premios = signal<Premio[]>([
    { id: 'bota_oro', titulo: 'Bota de Oro', icono: '🥇', descripcion: 'Máximo goleador del Mundial', valor: '', puntos: 10 },
    { id: 'balon_oro', titulo: 'Balón de Oro', icono: '⭐', descripcion: 'Mejor jugador del torneo', valor: '', puntos: 10 },
    { id: 'guante_oro', titulo: 'Guante de Oro', icono: '🧤', descripcion: 'Mejor portero del torneo', valor: '', puntos: 8 },
    { id: 'jugador_joven', titulo: 'Jugador Joven', icono: '🌟', descripcion: 'Mejor joven del Mundial', valor: '', puntos: 8 },
    { id: 'equipo_revelacion', titulo: 'Equipo Revelación', icono: '🚀', descripcion: 'Selección sorpresa del torneo', valor: '', puntos: 5 },
    { id: 'decepcion', titulo: 'Decepción del Mundial', icono: '💥', descripcion: 'Selección que más decepciona', valor: '', puntos: 5 },
    { id: 'goleador_espana', titulo: 'Goleador de España', icono: '⚽', descripcion: 'Jugador español con más goles', valor: '', puntos: 8 }
  ]);

  async ngOnInit() {
    const uid = this.auth.usuario()?.id;
    if (!uid) return;

    const [predicciones, inicioMundial] = await Promise.all([
      this.svc.getPrediccionesUsuario(uid),
      this.svc.getInicioMundial()
    ]);

    if (inicioMundial) {
      this.bloqueado.set(new Date() >= inicioMundial);
    }

    // Solo recuperamos la predicción textual del usuario
    this.premios.update(list =>
      list.map(p => {
        const existente = predicciones.find(x => x.categoria === p.id);
        return {
          ...p,
          valor: existente?.prediccion ?? ''
        };
      })
    );
  }

  async guardar() {
    const uid = this.auth.usuario()?.id;
    if (!uid) return;

    if (this.bloqueado()) {
      alert('Las predicciones ya están cerradas');
      return;
    }

    this.guardando.set(true);

    try {
      for (const premio of this.premios()) {
        if (!premio.valor.trim()) continue;

        await this.svc.upsertPrediccion(uid, premio.id, premio.valor);
      }
      alert('Predicciones guardadas con éxito');
    } catch (error) {
      console.error(error);
      alert('Hubo un error al guardar');
    } finally {
      this.guardando.set(false);
    }
  }
}