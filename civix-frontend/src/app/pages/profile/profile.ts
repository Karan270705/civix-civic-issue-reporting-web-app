import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../services/auth';
import { IssueService } from '../../services/issue';
import { SolutionService } from '../../services/solution';
import { User, UserStats, Badge } from '../../models/user.model';
import { Issue } from '../../models/issue.model';
import { Solution } from '../../models/solution.model';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, AsyncPipe, ReactiveFormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit {
  private authService     = inject(AuthService);
  private issueService    = inject(IssueService);
  private solutionService = inject(SolutionService);
  private router          = inject(Router);
  private fb              = inject(FormBuilder);

  // ── Auth state ─────────────────────────────────────────────────────────────
  user$    = this.authService.currentUser$;

  // ── Page state ─────────────────────────────────────────────────────────────
  loading       = signal(true);
  editMode      = signal(false);
  saveLoading   = signal(false);
  saveError     = signal('');

  userIssues    = signal<Issue[]>([]);
  userSolutions = signal<Solution[]>([]);

  // ── Edit form ──────────────────────────────────────────────────────────────
  editForm!: FormGroup;

  // ── Derived stats ──────────────────────────────────────────────────────────
  stats = computed<UserStats>(() => {
    const issues    = this.userIssues();
    const solutions = this.userSolutions();
    const accepted  = solutions.filter(s => s.is_accepted).length;
    return {
      issuesPosted:      issues.length,
      solutionsGiven:    solutions.length,
      acceptedSolutions: accepted,
      civicScore:        issues.length * 10 + solutions.length * 5 + accepted * 20
    };
  });

  badges = computed<Badge[]>(() => {
    const s = this.stats();
    return [
      {
        id: 'first_issue',
        label: 'First Report',
        description: 'Posted your first civic issue',
        icon: '🏁',
        earned: s.issuesPosted >= 1
      },
      {
        id: 'first_solution',
        label: 'Problem Solver',
        description: 'Proposed your first solution',
        icon: '💡',
        earned: s.solutionsGiven >= 1
      },
      {
        id: 'accepted_solution',
        label: 'Community Choice',
        description: 'Had a solution accepted by the community',
        icon: '✅',
        earned: s.acceptedSolutions >= 1
      },
      {
        id: 'ten_issues',
        label: 'Active Citizen',
        description: 'Posted 10 or more civic issues',
        icon: '🏆',
        earned: s.issuesPosted >= 10
      },
      {
        id: 'civic_50',
        label: 'Civic Champion',
        description: 'Earned a Civic Score of 50 or more',
        icon: '⭐',
        earned: s.civicScore >= 50
      }
    ];
  });

  earnedBadges  = computed(() => this.badges().filter(b => b.earned));
  pendingBadges = computed(() => this.badges().filter(b => !b.earned));

  ngOnInit(): void {
    const user = this.authService.currentUser;
    if (!user) { this.router.navigate(['/login']); return; }

    this.editForm = this.fb.group({
      bio:           [user.bio ?? '', [Validators.maxLength(200)]],
      profile_image: [user.profile_image ?? '']
    });

    // Load user's issues + solutions in parallel
    forkJoin([
      this.issueService.getIssuesByUser(user.id),
      this.solutionService.getSolutionsByUser(user.id)
    ]).subscribe(([issues, solutions]) => {
      this.userIssues.set(issues);
      this.userSolutions.set(solutions);
      this.loading.set(false);
    });
  }

  // ── Edit profile ───────────────────────────────────────────────────────────

  openEdit(): void {
    const user = this.authService.currentUser;
    this.editForm.patchValue({
      bio: user?.bio ?? '',
      profile_image: user?.profile_image ?? ''
    });
    this.saveError.set('');
    this.editMode.set(true);
  }

  cancelEdit(): void { this.editMode.set(false); }

  async saveProfile(): Promise<void> {
    if (this.editForm.invalid || this.saveLoading()) return;
    this.saveLoading.set(true);
    this.saveError.set('');

    const raw = this.editForm.value;
    const result = await this.authService.updateProfile({
      bio: raw.bio?.trim() ?? '',
      profile_image: raw.profile_image?.trim() || null
    });

    this.saveLoading.set(false);
    if (result.success) {
      this.editMode.set(false);
    } else {
      this.saveError.set(result.message);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  getInitial(username: string): string {
    return username[0]?.toUpperCase() ?? '?';
  }

  getMemberSince(createdAt: string): string {
    return new Date(createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  getStatusColor(status: string): string {
    const map: Record<string, string> = {
      reported: 'status-reported', verified: 'status-verified',
      in_progress: 'status-progress', resolved: 'status-resolved'
    };
    return map[status] ?? '';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      reported: 'Reported', verified: 'Verified',
      in_progress: 'In Progress', resolved: 'Resolved'
    };
    return map[status] ?? status;
  }

  getCategoryIcon(category: string): string {
    const map: Record<string, string> = {
      pothole: '🕳️', garbage: '🗑️', water: '💧', electricity: '⚡', other: '📋'
    };
    return map[category] ?? '📋';
  }

  getScoreRating(score: number): string {
    if (score >= 200) return 'Champion';
    if (score >= 100) return 'Active';
    if (score >= 50)  return 'Rising';
    return 'Newcomer';
  }
}
