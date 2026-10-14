import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';
import { ResetPasswordDto } from '../../auth.model';

type ResetPasswordState = 'idle' | 'loading' | 'success' | 'invalid' | 'rate-limited' | 'error';

const INVALID_TOKEN_CODES = ['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_USED'];

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  state: ResetPasswordState = 'idle';
  showPassword = false;
  showConfirm = false;
  retryAfter = 0;

  private token: string | null = null;
  private timerId: ReturnType<typeof setInterval> | null = null;

  resetPasswordForm = new FormGroup(
    {
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/),
      ]),
      confirmPassword: new FormControl('', [Validators.required]),
    },
    { validators: passwordsMatch },
  );

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');

    if (!this.token) {
      this.state = 'invalid';
    }
  }

  get rules() {
    const value = this.resetPasswordForm.get('password')?.value ?? '';
    return {
      length: value.length >= 8,
      letter: /[A-Za-z]/.test(value),
      number: /\d/.test(value),
    };
  }

  get countdownLabel(): string {
    const minutes = Math.floor(this.retryAfter / 60);
    const seconds = this.retryAfter % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  hasError(controlName: string, errorName: string): boolean {
    const control = this.resetPasswordForm.get(controlName);
    return !!(control?.hasError(errorName) && (control.dirty || control.touched));
  }

  hasMismatch(): boolean {
    const confirm = this.resetPasswordForm.get('confirmPassword');
    return this.resetPasswordForm.hasError('mismatch') && !!(confirm?.dirty || confirm?.touched);
  }

  onSubmit(): void {
    if (this.state === 'loading' || this.state === 'rate-limited' || !this.token) return;

    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    const dto: ResetPasswordDto = {
      token: this.token,
      password: this.resetPasswordForm.getRawValue().password ?? ''
    }
    this.state = 'loading';

    this.authService.resetPassword(dto).subscribe({
      next: () => {
        this.resetPasswordForm.reset();
        this.state = 'success';
      },
      error: (err: HttpErrorResponse) => {
        const code = err.error?.code;

        if (err.status === 429) {
          const retryAfterHeader = Number(err.headers?.get('Retry-After'));
          this.startCountdown(retryAfterHeader > 0 ? retryAfterHeader : 60);
        } else if (err.status === 410 || INVALID_TOKEN_CODES.includes(code)) {
          this.state = 'invalid';
        } else {
          this.state = 'error';
        }
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/sign-up']);
  }

  requestNewLink(): void {
    this.router.navigate(['/forgot-password']);
  }

  private startCountdown(seconds: number): void {
    this.clearTimer();
    this.retryAfter = seconds;
    this.state = 'rate-limited';

    this.timerId = setInterval(() => {
      this.retryAfter--;
      if (this.retryAfter <= 0) {
        this.clearTimer();
        this.state = 'idle';
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }
}