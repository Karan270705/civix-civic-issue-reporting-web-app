import { Component, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { IssueService } from '../../services/issue';
import { AuthService } from '../../services/auth';
import { IssueCategory } from '../../models/issue.model';

@Component({
  selector: 'app-create-issue',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './create-issue.html',
  styleUrl: './create-issue.css'
})
export class CreateIssue {
  private fb       = inject(FormBuilder);
  private router   = inject(Router);
  authService      = inject(AuthService);
  private issueService = inject(IssueService);

  form: FormGroup;
  loading    = signal(false);
  submitted  = signal(false);
  imagePreview = signal<string | null>(null);
  imageFile    = signal<File | null>(null);
  locationLoading     = signal(false);
  locationDetectError = signal('');
  serverError = signal('');

  readonly categories: { value: IssueCategory; label: string; icon: string }[] = [
    { value: 'pothole',     label: 'Pothole',           icon: '🕳️' },
    { value: 'garbage',     label: 'Garbage / Waste',   icon: '🗑️' },
    { value: 'water',       label: 'Water Supply',      icon: '💧' },
    { value: 'electricity', label: 'Electricity',       icon: '⚡' },
    { value: 'other',       label: 'Other',             icon: '📋' }
  ];

  constructor() {
    this.form = this.fb.group({
      title:       ['', [Validators.required, Validators.minLength(10), Validators.maxLength(120)]],
      description: ['', [Validators.required, Validators.minLength(30), Validators.maxLength(1000)]],
      category:    ['', Validators.required],
      location:    ['', [Validators.required, Validators.minLength(5)]],
      lat:         [null],
      lng:         [null]
    });
  }

  // ── Getters ──────────────────────────────────────────────────────────────

  get title()       { return this.form.get('title')!; }
  get description() { return this.form.get('description')!; }
  get category()    { return this.form.get('category')!; }
  get location()    { return this.form.get('location')!; }

  get titleError(): string {
    if (!this.title.touched) return '';
    if (this.title.hasError('required'))   return 'Title is required.';
    if (this.title.hasError('minlength'))  return 'Title must be at least 10 characters.';
    if (this.title.hasError('maxlength'))  return 'Title must be under 120 characters.';
    return '';
  }

  get descriptionError(): string {
    if (!this.description.touched) return '';
    if (this.description.hasError('required'))  return 'Description is required.';
    if (this.description.hasError('minlength')) return 'Please describe the issue in at least 30 characters.';
    if (this.description.hasError('maxlength')) return 'Keep the description under 1000 characters.';
    return '';
  }

  get categoryError(): string {
    if (!this.category.touched) return '';
    if (this.category.hasError('required')) return 'Please select a category.';
    return '';
  }

  get locationError(): string {
    if (!this.location.touched) return '';
    if (this.location.hasError('required'))  return 'Location is required.';
    if (this.location.hasError('minlength')) return 'Please enter a more specific location.';
    return '';
  }

  get titleChars(): number { return (this.title.value ?? '').length; }
  get descChars():  number { return (this.description.value ?? '').length; }

  // ── Image handling ────────────────────────────────────────────────────────

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.serverError.set('Image must be under 5 MB.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.serverError.set('Only image files are allowed.');
      return;
    }

    this.imageFile.set(file);
    const reader = new FileReader();
    reader.onload = e => this.imagePreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
    this.serverError.set('');
  }

  removeImage(): void {
    this.imageFile.set(null);
    this.imagePreview.set(null);
  }

  // ── Geolocation ───────────────────────────────────────────────────────────

  detectLocation(): void {
    if (!navigator.geolocation) {
      this.locationDetectError.set('Geolocation is not supported by your browser.');
      return;
    }
    this.locationLoading.set(true);
    this.locationDetectError.set('');

    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = +pos.coords.latitude.toFixed(6);
        const lng = +pos.coords.longitude.toFixed(6);
        this.form.patchValue({ lat, lng, location: `${lat}, ${lng}` });
        this.locationLoading.set(false);
      },
      () => {
        this.locationDetectError.set('Could not detect location. Please type it manually.');
        this.locationLoading.set(false);
      },
      { timeout: 8000 }
    );
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;

    const user = this.authService.currentUser;
    if (!user) { this.router.navigate(['/login']); return; }

    this.loading.set(true);
    this.serverError.set('');

    try {
      // In real app: upload image first, get URL back from API
      // For now: use the dataURL as image_url (or null if no image)
      const image_url = this.imagePreview() ?? null;

      this.issueService.addIssue(
        {
          title:       this.title.value.trim(),
          description: this.description.value.trim(),
          category:    this.category.value as IssueCategory,
          location:    this.location.value.trim(),
          lat:         this.form.value.lat ?? null,
          lng:         this.form.value.lng ?? null,
          image_url
        },
        user.id,
        user.username
      ).subscribe({
        next: (issue) => {
          this.submitted.set(true);
          this.loading.set(false);
          // Navigate to the issue detail after short delay
          setTimeout(() => this.router.navigate(['/issues', issue.id]), 1800);
        },
        error: () => {
          this.serverError.set('Something went wrong. Please try again.');
          this.loading.set(false);
        }
      });
    } catch {
      this.serverError.set('Something went wrong. Please try again.');
      this.loading.set(false);
    }
  }
}
