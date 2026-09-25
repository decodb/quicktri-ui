import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-sign-in',
  imports: [ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss'
})
export class SignInComponent {
  showPassword = signal(false);
  signinForm = new FormGroup({
    email:    new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  hasError(controlName: string, errorName: string): boolean {
    const control = this.signinForm.get(controlName);
    return !!control?.hasError(errorName) && (control?.dirty || control?.touched);
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    if (this.signinForm.invalid) {
      this.signinForm.markAllAsTouched();
      return;
    }
    console.log(this.signinForm.value);
  }
}
