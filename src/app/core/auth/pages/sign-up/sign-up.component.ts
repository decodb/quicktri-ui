import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-sign-up',
  imports: [ReactiveFormsModule, RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.scss'
})
export class SignUpComponent {
  showPassword = signal(false);

  signupForm = new FormGroup({
    firstName:       new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]),
    lastName:        new FormControl('', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]),
    email:           new FormControl('', [Validators.required, Validators.email]),
    password:        new FormControl('', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)]),
    confirmPassword: new FormControl('', [Validators.required]),
  }, { validators: this.passwordsMatchValidator });

  constructor(private fb: FormBuilder) {}

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  hasError(path: string | string[], error: string): boolean {
    const control = this.signupForm.get(path);
    return !!control && control.hasError(error) && (control.dirty || control.touched);
  }

  private passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }
    console.log(this.signupForm.value);
  }

}
