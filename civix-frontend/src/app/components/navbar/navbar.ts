import { Component, signal, HostListener, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, AsyncPipe],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar {
  authService = inject(AuthService);

  mobileOpen   = signal(false);
  scrolled     = signal(false);
  dropdownOpen = signal(false);

  @HostListener('window:scroll')
  onScroll() { this.scrolled.set(window.scrollY > 10); }

  /** Close dropdown when clicking outside */
  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    const target = e.target as HTMLElement;
    if (!target.closest('.nav-user-menu')) {
      this.dropdownOpen.set(false);
    }
  }

  toggleMobile()   { this.mobileOpen.update(v => !v); }
  closeMobile()    { this.mobileOpen.set(false); }
  toggleDropdown() { this.dropdownOpen.update(v => !v); }

  logout() {
    this.dropdownOpen.set(false);
    this.closeMobile();
    this.authService.logout();
  }
}
