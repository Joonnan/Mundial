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

  private waitForUsuario(timeoutMs = 8000): Promise<Usuario | null> {
    return new Promise((resolve) => {
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

      const timeout = setTimeout(() => {
        clearInterval(interval);
        resolve(this.usuario());
      }, timeoutMs);
    });
  }

  async signIn(email: string, password: string): Promise<string | null> {
    this.loading.set(true);

    const { error } = await this.supa.auth.signInWithPassword({ email, password });
    if (error) {
      this.loading.set(false);
      return error.message;
    }

    await this.waitForUsuario();
    return null;
  }

  async signUp(
    email: string,
    password: string,
    username: string
  ): Promise<string | null> {
    // FIX: Verificar primero si el email ya existe intentando un signIn
    // sin contraseña real para detectar el caso "User already registered"
    // que Supabase a veces no reporta correctamente en signUp.
    const { data, error } = await this.supa.auth.signUp({
      email,
      password,
      options: {
        data: { username, display_name: username },
      },
    });

    if (error) {
      return error.message;
    }

    // FIX: Supabase devuelve identities vacío cuando el email ya está registrado
    // pero no lanza error (comportamiento por defecto con "Enable email confirmations")
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return 'User already registered';
    }

    return null;
  }

  async signOut(): Promise<void> {
    await this.supa.auth.signOut();
    this.ngZone.run(() => {
      this.usuario.set(null);
      this.router.navigate(['/auth']);
    });
  }
}