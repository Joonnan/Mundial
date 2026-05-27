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
  styleUrl: './login.component.scss'
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
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  setMode(m: 'login' | 'register') {
    this.mode = m;
    this.error = null;
    this.success = null;
    this.form.reset();
  }

 // En login.component.ts, modifica el método submit
async submit() {
  if (this.form.invalid) { this.form.markAllAsTouched(); return; }
  
  // Evitar doble clic
  if (this.loading) return; 

  this.loading = true;
  this.error = null;
  this.success = null;

  try {
    const { email, password, username } = this.form.value;

    if (this.mode === 'login') {
      const err = await this.auth.signIn(email!, password!);
      if (err) this.error = err;
      else this.router.navigate(['/']);
    } else {
      // Registro
      const err = await this.auth.signUp(email!, password!, username!);
      if (err) {
        this.error = err;
      } else {
        this.success = '¡Cuenta creada! Revisa tu email.';
      }
    }
  } catch (e) {
    this.error = 'Ocurrió un error inesperado. Intenta de nuevo más tarde.';
  } finally {
    // IMPORTANTE: Esto asegura que el botón se reactive pase lo que pase
    this.loading = false;
  }
}
}
