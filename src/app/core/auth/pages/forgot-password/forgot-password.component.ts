import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {
  resetPasswordForm = new FormGroup({
    email:    new FormControl('', [Validators.required, Validators.email]),
  });

  hasError(controlName: string, errorName: string): boolean {
    const control = this.resetPasswordForm.get(controlName);
    return !!control?.hasError(errorName) && (control?.dirty || control?.touched);
  }

  onSubmit(): void {
    if (this.resetPasswordForm.invalid) {
      this.resetPasswordForm.markAllAsTouched();
      return;
    }
    console.log(this.resetPasswordForm.value);
  }
}
