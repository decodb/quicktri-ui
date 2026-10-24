import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService, AuthUser } from '../../auth.service';

type SignInState = 'idle' | 'loading' | 'invalid-credentials' | 'unverified' | 'rate-limited' | 'error';
type ResendState = 'idle' | 'sending' | 'sent';

@Component({
  selector: 'app-sign-in',
  imports: [ReactiveFormsModule, RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss'
})
export class SignInComponent implements OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  showPassword = signal(false);
  state = signal<SignInState>('idle');
  resendState = signal<ResendState>('idle');
  retryAfter = signal(0);

  countdownLabel = computed(() => {
    const total = this.retryAfter();
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  });

  private timerId: ReturnType<typeof setInterval> | null = null;

  signinForm = new FormGroup({
    email:    new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  hasError(controlName: string, errorName: string): boolean {
    const control = this.signinForm.get(controlName);
    return !!(control?.hasError(errorName) && (control.dirty || control.touched));
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    // guards against double-submits and Enter-key presses while locked
    if (this.state() === 'loading' || this.state() === 'rate-limited') return;

    if (this.signinForm.invalid) {
      this.signinForm.markAllAsTouched();
      return;
    }

    const { email, password } = this.signinForm.getRawValue();
    this.state.set('loading');
    this.resendState.set('idle');

    this.authService.login((email ?? '').trim().toLowerCase(), password ?? '').subscribe({
      next: (user) => this.router.navigateByUrl(this.redirectTarget(user)),
      error: (err: HttpErrorResponse) => this.handleError(err),
    });
  }

  resendVerification(): void {
    if (this.resendState() !== 'idle') return;

    const email = (this.signinForm.getRawValue().email ?? '').trim().toLowerCase();
    if (!email) return;

    this.resendState.set('sending');

    this.authService.resendVerificationByEmail(email).subscribe({
      next: () => this.resendState.set('sent'),
      error: (err: HttpErrorResponse) => {
        this.resendState.set('idle');
        if (err.status === 429) {
          this.startCountdown(this.parseRetryAfter(err));
        } else {
          this.state.set('error');
        }
      },
    });
  }

  private handleError(err: HttpErrorResponse): void {
    const code = err.error?.code;

    if (err.status === 401) {
      this.state.set('invalid-credentials');
    } else if (err.status === 403 && code === 'EMAIL_NOT_VERIFIED') {
      this.state.set('unverified');
    } else if (err.status === 429) {
      this.startCountdown(this.parseRetryAfter(err));
    } else {
      this.state.set('error'); 
    }
  }

  // Send people back to the page they were trying to reach, otherwise by role.
  // Only same-app paths are accepted so a crafted ?returnUrl= can't redirect off-site.
  private redirectTarget(user: AuthUser): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl && returnUrl.startsWith('/') && !returnUrl.startsWith('//')) {
      return returnUrl;
    }
    return user.role === 'ADMIN' ? '/admin/quizzes' : '/quizzes';
  }

  private parseRetryAfter(err: HttpErrorResponse): number {
    const header = Number(err.headers?.get('Retry-After'));
    return header > 0 ? header : 60;
  }

  private startCountdown(seconds: number): void {
    this.clearTimer();
    this.retryAfter.set(seconds);
    this.state.set('rate-limited');

    this.timerId = setInterval(() => {
      this.retryAfter.update((v) => v - 1);
      if (this.retryAfter() <= 0) {
        this.clearTimer();
        this.state.set('idle'); // unlocks automatically, no refresh needed
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