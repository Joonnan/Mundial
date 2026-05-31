// src/app/features/auth/login.component.ts
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  mode: 'login' | 'register' = 'login';
  loading = false;
  error: string | null = null;
  success: string | null = null;

  form = this.fb.group({
    username: ['', [Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  setMode(m: 'login' | 'register') {
    this.mode = m;
    this.error = null;
    this.success = null;
    this.form.reset();
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.loading) return;

    this.loading = true;
    this.error = null;
    this.success = null;

    try {
      const { email, password, username } = this.form.value;

      if (this.mode === 'login') {
        // signIn ahora espera internamente a que el usuario esté listo
        const err = await this.auth.signIn(email!, password!);
        if (err) {
          this.error = this.translateError(err);
        } else {
          // El usuario ya está cargado en auth.usuario() → navegamos sin carreras
          await this.router.navigate(['/']);
        }
      } else {
        const err = await this.auth.signUp(email!, password!, username!);
        if (err) {
          this.error = this.translateError(err);
        } else {
          // Supabase requiere confirmar email antes de crear sesión.
          // No navegamos: esperamos a que el usuario confirme.
          this.success = '¡Cuenta creada! Revisa tu email para confirmar y luego entra.';
          this.setMode('login');
        }
      }
    } catch {
      this.error = 'Ocurrió un error inesperado. Inténtalo de nuevo.';
    } finally {
      this.loading = false;
    }
  }

  /** Traduce mensajes de error de Supabase al español */
  private translateError(msg: string): string {
    if (msg.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.';
    if (msg.includes('Email not confirmed')) return 'Confirma tu email antes de entrar.';
    if (msg.includes('User already registered')) return 'Ya existe una cuenta con ese email.';
    if (msg.includes('Password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
    if (msg.includes('rate limit')) return 'Demasiados intentos. Espera unos minutos.';
    return msg;
  }
}
