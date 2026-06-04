// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: '',
    loadComponent: () => import('./components/app-shell/app-shell.component').then(m => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'partidos', pathMatch: 'full' },
      {
        path: 'partidos',
        loadComponent: () => import('./features/partidos/partidos.component').then(m => m.PartidosComponent)
      },
      {
        path: 'clasificacion',
        loadComponent: () => import('./features/clasificacion/clasificacion.component').then(m => m.ClasificacionComponent)
      },
      {
        path: 'perfil',
        loadComponent: () => import('./features/perfil/perfil.component').then(m => m.PerfilComponent)
      },
      {
        path: 'admin',
        loadComponent: () => import('./features/admin/admin-panel.component').then(m => m.AdminPanelComponent),
      },
      {
           path: 'premios',
        loadComponent: () => import('./features/premios/premios.component').then(m => m.PremiosComponent),
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
