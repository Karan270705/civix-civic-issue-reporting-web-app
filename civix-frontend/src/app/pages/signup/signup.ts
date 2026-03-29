import { Component, signal, computed } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { AuthService } from '../../services/auth';

/** Cross-field validator: password and confirm must match */
function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pw && confirm && pw !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-signup',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class Signup {
  form: FormGroup;
  loading = signal(false);
  serverError = signal('');
  showPassword = signal(false);
  showConfirm = signal(false);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/']);
    }

    this.form = this.fb.group(
      {
        username: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]]
      },
      { validators: passwordMatchValidator }
    );
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get username() { return this.form.get('username')!; }
  get email()    { return this.form.get('email')!; }
  get password() { return this.form.get('password')!; }
  get confirm()  { return this.form.get('confirmPassword')!; }

  get usernameError(): string {
    if (!this.username.touched) return '';
    if (this.username.hasError('required')) return 'Username is required.';
    if (this.username.hasError('minlength')) return 'Username must be at least 3 characters.';
    if (this.username.hasError('pattern')) return 'Only letters, numbers and underscores allowed.';
    return '';
  }

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

  get confirmError(): string {
    if (!this.confirm.touched) return '';
    if (this.confirm.hasError('required')) return 'Please confirm your password.';
    if (this.form.hasError('passwordMismatch')) return 'Passwords do not match.';
    return '';
  }

  // ── Password strength ─────────────────────────────────────────────────────

  /** Returns 0–3 representing strength level */
  get strengthLevel(): number {
    const pw: string = this.password.value ?? '';
    if (pw.length < 6) return 0;
    let score = 1;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw) && /[0-9]/.test(pw)) score++;
    return score;
  }

  get strengthLabel(): string {
    return ['', 'Weak', 'Fair', 'Strong'][this.strengthLevel];
  }

  get strengthClass(): string {
    return ['', 'weak', 'fair', 'strong'][this.strengthLevel];
  }

  isSegmentActive(index: number): boolean {
    return this.password.value.length > 0 && index < this.strengthLevel;
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  togglePassword(): void { this.showPassword.update(v => !v); }
  toggleConfirm(): void  { this.showConfirm.update(v => !v); }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;

    this.serverError.set('');
    this.loading.set(true);

    try {
      const result = await this.authService.signup({
        username: this.username.value,
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
