import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import {
  User,
  AuthResponse,
  LoginPayload,
  SignupPayload,
  UpdateProfilePayload
} from '../models/user.model';
import { environment } from '../../environments/environment';

const LS_USER_KEY    = 'civix_user';
const LS_TOKEN_KEY   = 'civix_token';
const LS_USERS_STORE = 'civix_users_store';

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** API base — swap to real PHP URL when backend is ready */
  private readonly apiUrl = environment.apiUrl;

  // ── Reactive state: BehaviorSubject (Observable for components + direct .value access) ──
  private _currentUser$ = new BehaviorSubject<User | null>(this.loadUserFromStorage());

  /** Public observable — subscribe for reactive auth state */
  currentUser$: Observable<User | null> = this._currentUser$.asObservable();

  /** Signal-like getter for template interpolation — reads latest value */
  get currentUser() { return this._currentUser$.getValue(); }

  constructor(private router: Router) {}

  // ─── State helpers ─────────────────────────────────────────────────────────

  isLoggedIn(): boolean { return this._currentUser$.getValue() !== null; }
  getToken(): string | null { return localStorage.getItem(LS_TOKEN_KEY); }

  /** Returns current user as an observable (for guards, resolvers etc.) */
  getCurrentUser(): Observable<User | null> { return this.currentUser$; }

  // ─── Login ─────────────────────────────────────────────────────────────────

  /**
   * Mock login — validates against localStorage store.
   * ⚡ REPLACE THIS BLOCK with HttpClient POST to `${this.apiUrl}/auth/login`
   */
  async login(payload: LoginPayload): Promise<AuthResponse> {
    await this.delay(900);

    const users = this.getStoredUsers();
    const match = users.find(u => u.email === payload.email && u._password === payload.password);
    if (!match) return { success: false, message: 'Invalid email or password.' };

    const user: User = {
      id: match.id, username: match.username, email: match.email,
      bio: match.bio ?? '', profile_image: match.profile_image ?? null,
      created_at: match.created_at
    };
    const token = this.mockToken(user);
    this.persistSession(user, token);
    return { success: true, message: 'Login successful.', user, token };
  }

  // ─── Signup ────────────────────────────────────────────────────────────────

  /**
   * Mock signup — saves to localStorage user store.
   * ⚡ REPLACE THIS BLOCK with HttpClient POST to `${this.apiUrl}/auth/register`
   */
  async signup(payload: SignupPayload): Promise<AuthResponse> {
    await this.delay(900);

    const users = this.getStoredUsers();
    if (users.some(u => u.email === payload.email))
      return { success: false, message: 'An account with this email already exists.' };
    if (users.some(u => u.username === payload.username))
      return { success: false, message: 'This username is taken. Try another.' };

    const newUser = {
      id: Date.now(),
      username: payload.username,
      email: payload.email,
      bio: '',
      profile_image: null,
      _password: payload.password,
      created_at: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem(LS_USERS_STORE, JSON.stringify(users));

    const user: User = {
      id: newUser.id, username: newUser.username, email: newUser.email,
      bio: newUser.bio, profile_image: newUser.profile_image,
      created_at: newUser.created_at
    };
    const token = this.mockToken(user);
    this.persistSession(user, token);
    return { success: true, message: 'Account created successfully.', user, token };
  }

  // ─── Update Profile ────────────────────────────────────────────────────────

  /**
   * Updates user bio / profile image.
   * ⚡ REPLACE with HttpClient PATCH to `${this.apiUrl}/users/${user.id}`
   */
  async updateProfile(payload: UpdateProfilePayload): Promise<AuthResponse> {
    await this.delay(600);

    const current = this._currentUser$.getValue();
    if (!current) return { success: false, message: 'Not logged in.' };

    // Update users store
    const users = this.getStoredUsers();
    const idx = users.findIndex(u => u.id === current.id);
    if (idx !== -1) {
      if (payload.bio !== undefined)           users[idx].bio = payload.bio;
      if (payload.profile_image !== undefined) users[idx].profile_image = payload.profile_image;
      localStorage.setItem(LS_USERS_STORE, JSON.stringify(users));
    }

    // Update current session
    const updated: User = {
      ...current,
      bio:           payload.bio           ?? current.bio,
      profile_image: payload.profile_image ?? current.profile_image
    };
    this.persistSession(updated, this.getToken() ?? '');
    return { success: true, message: 'Profile updated.', user: updated };
  }

  // ─── Logout ────────────────────────────────────────────────────────────────

  logout(): void {
    localStorage.removeItem(LS_USER_KEY);
    localStorage.removeItem(LS_TOKEN_KEY);
    this._currentUser$.next(null);
    this.router.navigate(['/login']);
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private persistSession(user: User, token: string): void {
    localStorage.setItem(LS_USER_KEY, JSON.stringify(user));
    if (token) localStorage.setItem(LS_TOKEN_KEY, token);
    this._currentUser$.next(user);
  }

  private loadUserFromStorage(): User | null {
    try {
      const raw = localStorage.getItem(LS_USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  private getStoredUsers(): any[] {
    try {
      return JSON.parse(localStorage.getItem(LS_USERS_STORE) ?? '[]');
    } catch { return []; }
  }

  private mockToken(user: User): string {
    const h = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const p = btoa(JSON.stringify({ sub: user.id, username: user.username, exp: Date.now() + 86400000 }));
    return `${h}.${p}.mock_signature`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(res => setTimeout(res, ms));
  }
}
