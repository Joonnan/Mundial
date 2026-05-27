// src/app/app-shell.component.ts
import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss'
})
export class AppShellComponent {
  auth = inject(AuthService);
  menuOpen = false;

  inicial = computed(() => {
    const u = this.auth.usuario();
    return (u?.display_name || u?.username || '?').charAt(0).toUpperCase();
  });
}
