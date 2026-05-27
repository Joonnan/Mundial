// src/app/core/services/auth.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { Usuario } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supa = inject(SupabaseService).client;
  private router = inject(Router);

  readonly usuario = signal<Usuario | null>(null);
  readonly loading = signal(true);
  readonly isAdmin = computed(() => this.usuario()?.rol === 'admin');
  readonly isLoggedIn = computed(() => !!this.usuario());

  constructor() {
    // Restaurar sesión al iniciar
    this.supa.auth.getSession().then(({ data }) => {
      if (data.session) {
        this.fetchUsuario(data.session.user.id);
      } else {
        this.loading.set(false);
      }
    });

    // Escuchar cambios de auth
    this.supa.auth.onAuthStateChange((_event, session) => {
      if (session) {
        this.fetchUsuario(session.user.id);
      } else {
        this.usuario.set(null);
        this.loading.set(false);
      }
    });
  }

  private async fetchUsuario(id: string): Promise<void> {
    const { data } = await this.supa
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single();
    this.usuario.set(data ?? null);
    this.loading.set(false);
  }

  async signIn(email: string, password: string): Promise<string | null> {
    const { error } = await this.supa.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }

  async signUp(email: string, password: string, username: string): Promise<string | null> {
    const { error } = await this.supa.auth.signUp({
      email, password,
      options: { data: { username, display_name: username } }
    });
    return error?.message ?? null;
  }

  async signOut(): Promise<void> {
    await this.supa.auth.signOut();
    this.usuario.set(null);
    this.router.navigate(['/auth']);
  }
}
