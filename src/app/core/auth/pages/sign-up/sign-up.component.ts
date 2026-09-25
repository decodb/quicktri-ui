import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';
import { SignUpDto } from '../../auth.model';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-sign-up',
  imports: [ReactiveFormsModule, RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.scss'
})
export class SignUpComponent {
  showPassword = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  statusCode = signal<200 | 409 |  429 | 500 | null>(null);

  signupForm = new FormGroup({
    firstName:       new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]),
    lastName:        new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]),
    email:           new FormControl('', [Validators.required, Validators.email]),
    password:        new FormControl('', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)]),
    confirmPassword: new FormControl('', [Validators.required]),
  }, { validators: this.passwordsMatchValidator });

  constructor(private authService: AuthService) {}

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  hasError(path: string | string[], error: string): boolean {
    const control = this.signupForm.get(path);
    return !!control && control.hasError(error) && (control.dirty || control.touched);
  }

  private passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password');
    const confirmPassword = group.get('confirmPassword');

    if (!password || !confirmPassword) return null;

    if (password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ ...confirmPassword.errors, passwordMismatch: true });
    } else {
      if (confirmPassword.hasError('passwordMismatch')) {
        const { passwordMismatch, ...rest } = confirmPassword.errors ?? {};
        confirmPassword.setErrors(Object.keys(rest).length ? rest : null);
      }
    }
    return null;
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }
    const dto: SignUpDto = {
      firstName: this.signupForm.controls.firstName.value!,
      lastName: this.signupForm.controls.lastName.value!,
      email: this.signupForm.controls.email.value!,
      password: this.signupForm.controls.password.value!
    }

    this.isLoading.set(true);
    this.authService.signUp(dto)
      .subscribe({
        next: (response) => {
          console.log(response)
          this.statusCode.set(200);
          this.isLoading.set(false);
        },
        error: (err: HttpErrorResponse) => {
          console.log(err);
          switch (err.error.statusCode) {
            case 429:
              this.statusCode.set(429);
              break;
            case 500: 
              this.statusCode.set(500);
              break;
            default:
              this.statusCode.set(409);
              break;
          }
          this.isLoading.set(false);
        }
      })
  }

}
