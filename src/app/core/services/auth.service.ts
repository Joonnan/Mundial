// src/app/core/services/auth.service.ts
import { Injectable, signal, computed, inject, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { Usuario } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supa = inject(SupabaseService).client;
  private router = inject(Router);
  private ngZone = inject(NgZone); // Inyectamos la zona de Angular

  readonly usuario = signal<Usuario | null>(null);
  readonly loading = signal(true);
  readonly isAdmin = computed(() => this.usuario()?.rol === 'admin');
  readonly isLoggedIn = computed(() => !!this.usuario());

  constructor() {
    // Escuchar cambios de auth y forzar a que Angular actualice la vista
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
        
      // Actualizamos los signals dentro de NgZone
      this.ngZone.run(() => {
        this.usuario.set(data ?? null);
        this.loading.set(false);
      });
    } catch (error) {
      // Por si hay algún error de red, quitamos el estado de carga
      this.ngZone.run(() => {
        this.loading.set(false);
      });
    }
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
    this.ngZone.run(() => {
      this.usuario.set(null);
      this.router.navigate(['/auth']);
    });
  }
}