import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../auth.service';
import { HttpErrorResponse } from '@angular/common/http';

type VerifyState = 'loading' | 'success' | 'expired' | 'already-verified' | 'error';

@Component({
  selector: 'app-verify-email',
  imports: [],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss'
})
export class VerifyEmailComponent implements OnInit {
  state: VerifyState = 'loading';
  private token: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');

    if (!this.token) {
      this.state = 'error';
      return;
    }

    this.verifyToken(this.token);
  }

  private verifyToken(token: string): void {
    this.state = 'loading';

    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.state = 'success';
      },
      error: (err: HttpErrorResponse) => {
        const code = err?.error?.code;

        if (err.status === 410 || code === 'TOKEN_EXPIRED') {
          this.state = 'expired';
        } else if (err.status === 409 || code === 'ALREADY_VERIFIED') {
          this.state = 'already-verified';
        } else {
          this.state = 'error';
        }
      },
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
