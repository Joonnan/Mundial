import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Premio {
  id: string;
  titulo: string;
  icono: string;
  descripcion: string;
  valor: string;
}

@Component({
  selector: 'app-premios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './premios.component.html',
  styleUrl: './premios.component.scss'
})
export class PremiosComponent {

  guardando = signal(false);

  premios = signal<Premio[]>([
    {
      id: 'bota_oro',
      titulo: 'Bota de Oro',
      icono: '🥇',
      descripcion: 'Máximo goleador del Mundial',
      valor: ''
    },
    {
      id: 'balon_oro',
      titulo: 'Balón de Oro',
      icono: '⭐',
      descripcion: 'Mejor jugador del torneo',
      valor: ''
    },
    {
      id: 'guante_oro',
      titulo: 'Guante de Oro',
      icono: '🧤',
      descripcion: 'Mejor portero del torneo',
      valor: ''
    },
    {
      id: 'jugador_joven',
      titulo: 'Jugador Joven',
      icono: '🌟',
      descripcion: 'Mejor joven del Mundial',
      valor: ''
    },
    {
      id: 'equipo_revelacion',
      titulo: 'Equipo Revelación',
      icono: '🚀',
      descripcion: 'Selección sorpresa del torneo',
      valor: ''
    },
    {
      id: 'decepcion',
      titulo: 'Decepción del Mundial',
      icono: '💥',
      descripcion: 'Selección que más decepciona',
      valor: ''
    },
    {
      id: 'goleador_espana',
      titulo: 'Goleador de España',
      icono: '⚽',
      descripcion: 'Jugador español con más goles',
      valor: ''
    }
  ]);

  guardar() {

    this.guardando.set(true);

    setTimeout(() => {
      this.guardando.set(false);

      console.log(
        this.premios().map(p => ({
          categoria: p.id,
          valor: p.valor
        }))
      );

    }, 1000);
  }

}