import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { authGuard } from './guards/auth-guard';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'feed', loadComponent: () => import('./pages/feed/feed').then(m => m.Feed) },
  { path: 'login',    loadComponent: () => import('./pages/login/login').then(m => m.Login) },
  { path: 'signup',   loadComponent: () => import('./pages/signup/signup').then(m => m.Signup) },
  { path: 'issues/new', canActivate: [authGuard], loadComponent: () => import('./pages/create-issue/create-issue').then(m => m.CreateIssue) },
  { path: 'issues/:id', loadComponent: () => import('./pages/issue-detail/issue-detail').then(m => m.IssueDetail) },
  { path: 'profile', canActivate: [authGuard], loadComponent: () => import('./pages/profile/profile').then(m => m.Profile) },
  { path: '**', redirectTo: '' }
];
