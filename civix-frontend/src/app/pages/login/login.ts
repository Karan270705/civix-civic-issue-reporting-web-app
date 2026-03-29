import { Component, signal } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  form: FormGroup;
  loading = signal(false);
  serverError = signal('');
  showPassword = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // Redirect if already logged in
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
    }

    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // ── Getters for template ──────────────────────────────────────────────────

  get email() { return this.form.get('email')!; }
  get password() { return this.form.get('password')!; }

  get emailError(): string {
    if (!this.email.touched) return '';
    if (this.email.hasError('required')) return 'Email is required.';
    if (this.email.hasError('email')) return 'Enter a valid email address.';
    return '';
  }

  get passwordError(): string {
    if (!this.password.touched) return '';
    if (this.password.hasError('required')) return 'Password is required.';
    if (this.password.hasError('minlength')) return 'Password must be at least 6 characters.';
    return '';
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;

    this.serverError.set('');
    this.loading.set(true);

    try {
      const result = await this.authService.login({
        email: this.email.value,
        password: this.password.value
      });

      if (result.success) {
        this.router.navigate(['/']);
      } else {
        this.serverError.set(result.message);
      }
    } catch {
      this.serverError.set('Something went wrong. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }
}
