import { inject, Injectable } from "@angular/core";
import { ForgotPasswordDto, SignUpDto } from "./auth.model";
import { Observable } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../../environments/environment";

@Injectable({ providedIn: 'root' })
export class AuthService {
    private http = inject(HttpClient);
    
    constructor() {}

    // sign up
    signUp (dto: SignUpDto): Observable<{ email: string }> {
        return this.http.post<{ email: string }>(`${environment.apiUrl}/auth/sign-up`, dto);
    }

    // verify email

    // forgot password
    forgotPassword(dto: ForgotPasswordDto): Observable<{ message: string }> {
        return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/forgot-password`, dto);
    }

    //
}