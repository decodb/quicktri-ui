import { Component, CUSTOM_ELEMENTS_SCHEMA, OnDestroy, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';
import { ForgotPasswordDto } from '../../auth.model';


type ForgotPasswordState = 'idle' | 'loading' | 'success' | 'rate-limited' | 'error';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent implements OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);

  state: ForgotPasswordState = 'idle';
  submittedEmail = '';
  retryAfter = 0;
  private timerId: ReturnType<typeof setInterval> | null = null;

  resetPasswordForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
  });

  hasError(controlName: string, errorName: string): boolean {
    const control = this.resetPasswordForm.get(controlName);
    return !!(control?.hasError(errorName) && (control.dirty || control.touched));
  }

  onSubmit(): void {
    if (this.state === 'loading' || this.state === 'rate-limited') return;

    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }

    const dto: ForgotPasswordDto = {
      email: this.resetPasswordForm.controls.email.value!,
    };
    this.state = 'loading';

    this.authService.forgotPassword(dto).subscribe({
      next: () => {
        this.submittedEmail = dto.email;
        this.state = 'success';
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 429) {
          const retryAfterHeader = Number(err.headers?.get('Retry-After'));
          this.startCountdown(retryAfterHeader > 0 ? retryAfterHeader : 60);
        } else {
          this.state = 'error';
        }
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
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