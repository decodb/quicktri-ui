import { computed, inject, Injectable, signal } from "@angular/core";
import { ForgotPasswordDto, ResetPasswordDto, SignUpDto } from "./auth.model";
import { catchError, finalize, firstValueFrom, Observable, of, tap } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";
import { Router } from "@angular/router";

/**
 * Roles a user can hold in the application.
 */
export type Role = 'STUDENT' | 'ADMIN';

/**
 * Shape of an authenticated user as returned by the API.
 */
export interface AuthUser {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
}

/** localStorage key under which the current user is persisted. */
const USER_STORAGE_KEY = 'quicktri.user';

/**
 * Handles authentication and holds the current user's session state.
 *
 * Responsibilities:
 * - Calling the backend auth endpoints (sign up, login, logout, password
 *   recovery, email verification).
 * - Exposing the current user as a read-only signal, plus derived signals
 *   such as `isLoggedIn` and `isAdmin`.
 * - Persisting the user in localStorage so the UI can render immediately
 *   on reload, before the session has been re-validated with the server.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
    private http = inject(HttpClient);
    private router = inject(Router);

    /** Writable signal holding the current user (or `null` when signed out). */
    private _user = signal<AuthUser | null>(this.readStoredUser());

    /** Read-only signal of the currently authenticated user, or `null`. */
    readonly user = this._user.asReadonly();

    /** `true` when a user is currently set. */
    readonly isLoggedIn = computed(() => this._user() !== null);

    /** `true` when the current user has the `ADMIN` role. */
    readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');

    constructor() {}

    // ------- Registration & account recovery -------------

    /**
     * Registers a new account.
     *
     * @param dto - Sign-up details supplied by the user.
     * @returns An observable emitting the email address the account was created with.
     */
    signUp(dto: SignUpDto): Observable<{ email: string }> {
        return this.http.post<{ email: string }>(`${environment.apiUrl}/auth/sign-up`, dto);
    }

    /**
     * Verifies a user's email address using the token sent to them.
     *
     * @param token - Verification token from the verification email link.
     * @returns An observable emitting a confirmation message from the server.
     */
    verifyEmail(token: string): Observable<{ message: string }> {
        return this.http.get<{ message: string }>(
            `${environment.apiUrl}/auth/verify-email`,
            { params: { token } }
        );
    }

    /**
     * Requests a password-reset email.
     *
     * @param dto - Details identifying the account to reset.
     * @returns An observable emitting a confirmation message from the server.
     */
    forgotPassword(dto: ForgotPasswordDto): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/forgot-password`, dto);
    }

    /**
     * Sets a new password using a reset token.
     *
     * @param dto - Reset token and the new password.
     * @returns An observable emitting a confirmation message from the server.
     */
    resetPassword(dto: ResetPasswordDto): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/reset-password`, dto);
    }

    /**
     * Re-sends the verification email to the given address.
     *
     * @param email - Email address of the account awaiting verification.
     * @returns An observable that completes when the request finishes.
     */
    resendVerificationByEmail(email: string): Observable<unknown> {
        return this.http.post(`${environment.apiUrl}/auth/resend-verification`, { email });
    }

    // ------- Session management -------------

    /**
     * Authenticates a user with their credentials.
     * On success, the returned user is stored in the signal and in localStorage.
     *
     * @param email - The user's email address.
     * @param password - The user's password.
     * @returns An observable emitting the authenticated user.
     */
    login(email: string, password: string): Observable<AuthUser> {
        return this.http
            .post<AuthUser>(`${environment.apiUrl}/auth/sign-in`, { email, password })
            .pipe(tap((user) => this.setUser(user)));
    }

    /**
     * Signs the user out.
     * Local state is always cleared and the user is redirected to `/sign-in`,
     * even if the server request fails.
     *
     * @returns An observable that completes when the logout request finishes.
     */
    logout(): Observable<unknown> {
        return this.http.post(`${environment.apiUrl}/auth/logout`, {}).pipe(
            catchError(() => of(null)),
            finalize(() => {
                this.clearUser();
                this.router.navigate(['/sign-in']);
            }),
        );
    }

    /**
     * Fetches the currently authenticated user from the server.
     * On success, the local user state is refreshed with the response.
     *
     * @returns An observable emitting the current user.
     */
    me(): Observable<AuthUser> {
        return this.http.get<AuthUser>(`${environment.apiUrl}/auth/me`).pipe(tap((user) => this.setUser(user)));
    }

    /**
     * Restores the session by validating it with the server.
     * If validation fails, local user state is cleared and `null` is returned.
     *
     * @returns A promise resolving to the current user, or `null` if there is no valid session.
     */
    restoreSession(): Promise<AuthUser | null> {
        return firstValueFrom(
            this.me().pipe(
                catchError(() => {
                    this.clearUser();
                    return of(null);
                }),
            ),
        );
    }

    /**
     * Clears the locally stored session without calling the server
     * and without navigating anywhere.
     */
    clearSession(): void {
        this.clearUser();
    }

    // ------- Local state -------------

    /**
     * Sets the current user in the signal and persists it to localStorage.
     * Storage failures (e.g. storage disabled or full) are silently ignored.
     *
     * @param user - The user to store.
     */
    private setUser(user: AuthUser): void {
        this._user.set(user);
        try {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
        } catch {}
    }

    /**
     * Clears the current user from the signal and removes it from localStorage.
     * Storage failures are silently ignored.
     */
    private clearUser(): void {
        this._user.set(null);
        try {
            localStorage.removeItem(USER_STORAGE_KEY);
        } catch {}
    }

    /**
     * Reads the persisted user from localStorage.
     * Used to initialise the `_user` signal.
     *
     * @returns The stored user, or `null` if none exists or storage/parsing fails.
     */
    private readStoredUser(): AuthUser | null {
        try {
            const raw = localStorage.getItem(USER_STORAGE_KEY);
            return raw ? (JSON.parse(raw) as AuthUser) : null;
        } catch {
            return null;
        }
    }
}