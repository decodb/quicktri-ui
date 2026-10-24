import { Routes } from '@angular/router';
import { AUTH_ROUTES } from './core/auth/auth.routes';
import { PUBLIC_ROUTES } from './core/layout/public.routes';

export const routes: Routes = [
    ...AUTH_ROUTES,
    ...PUBLIC_ROUTES
];
