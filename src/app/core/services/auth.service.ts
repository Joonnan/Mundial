// src/app/core/services/auth.service.ts
import { Injectable, signal, computed, inject, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { Usuario } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supa = inject(SupabaseService).client;
  private router = inject(Router);
  private ngZone = inject(NgZone);

  readonly usuario = signal<Usuario | null>(null);
  readonly loading = signal(true);
  readonly isAdmin = computed(() => this.usuario()?.rol === 'admin');
  readonly isLoggedIn = computed(() => !!this.usuario());

  constructor() {
    this.supa.auth.onAuthStateChange((_event, session) => {
      this.ngZone.run(() => {
        if (session) {
          this.fetchUsuario(session.user.id);
        } else {
          this.usuario.set(null);
          this.loading.set(false);
        }
      });
    });
  }

  private async fetchUsuario(id: string): Promise<void> {
    try {
      const { data } = await this.supa
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .single();

      this.ngZone.run(() => {
        this.usuario.set(data ?? null);
        this.loading.set(false);
      });
    } catch {
      this.ngZone.run(() => {
        this.loading.set(false);
      });
    }
  }

  /**
   * Espera a que el signal `loading` sea false y devuelve el usuario.
   * Evita la condición de carrera entre signIn y onAuthStateChange.
   */
  private waitForUsuario(timeoutMs = 8000): Promise<Usuario | null> {
    return new Promise((resolve) => {
      // Si ya terminó de cargar, resolvemos de inmediato
      if (!this.loading()) {
        resolve(this.usuario());
        return;
      }

      const interval = setInterval(() => {
        if (!this.loading()) {
          clearInterval(interval);
          clearTimeout(timeout);
          resolve(this.usuario());
        }
      }, 50);

      // Timeout de seguridad para no bloquear la UI indefinidamente
      const timeout = setTimeout(() => {
        clearInterval(interval);
        resolve(this.usuario()); // devuelve lo que haya, aunque sea null
      }, timeoutMs);
    });
  }

  /**
   * Inicia sesión y espera a que el usuario esté completamente cargado
   * antes de devolver el control al componente.
   */
  async signIn(email: string, password: string): Promise<string | null> {
    // Marcamos loading = true para que waitForUsuario no resuelva prematuramente
    this.loading.set(true);

    const { error } = await this.supa.auth.signInWithPassword({ email, password });
    if (error) {
      this.loading.set(false);
      return error.message;
    }

    // Esperamos a que onAuthStateChange → fetchUsuario terminen
    await this.waitForUsuario();
    return null;
  }

  async signUp(email: string, password: string, username: string): Promise<string | null> {
    const { error } = await this.supa.auth.signUp({
      email,
      password,
      options: { data: { username, display_name: username } },
    });
    return error?.message ?? null;
  }

  async signOut(): Promise<void> {
    await this.supa.auth.signOut();
    this.ngZone.run(() => {
      this.usuario.set(null);
      this.router.navigate(['/auth']);
    });
  }
}
