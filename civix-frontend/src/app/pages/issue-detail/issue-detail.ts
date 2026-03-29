import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';

import { IssueService } from '../../services/issue';
import { SolutionService } from '../../services/solution';
import { CommentService } from '../../services/comment';
import { AuthService } from '../../services/auth';
import { StatusBadge } from '../../components/status-badge/status-badge';

import { Issue, VoteType } from '../../models/issue.model';
import { Solution } from '../../models/solution.model';
import { Comment } from '../../models/comment.model';

@Component({
  selector: 'app-issue-detail',
  imports: [RouterLink, AsyncPipe, ReactiveFormsModule, StatusBadge],
  templateUrl: './issue-detail.html',
  styleUrl: './issue-detail.css'
})
export class IssueDetail implements OnInit, OnDestroy {
  private route   = inject(ActivatedRoute);
  private router  = inject(Router);
  private fb      = inject(FormBuilder);
  authService     = inject(AuthService);
  private issueSvc    = inject(IssueService);
  private solutionSvc = inject(SolutionService);
  private commentSvc  = inject(CommentService);

  private sub?: Subscription;

  // ── State ──────────────────────────────────────────────────────────────────
  loading      = signal(true);
  issue        = signal<Issue | null>(null);
  solutions    = signal<Solution[]>([]);
  comments     = signal<Comment[]>([]);
  notFound     = signal(false);

  solutionLoading = signal(false);
  commentLoading  = signal(false);
  voteLoading     = signal(false);
  statusLoading   = signal(false);
  solutionVoting  = signal<number | null>(null); // id of solution being voted

  // ── Forms ─────────────────────────────────────────────────────────────────
  solutionForm = this.fb.group({
    text: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(1000)]]
  });

  commentForm = this.fb.group({
    text: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(500)]]
  });

  // ── Derived ───────────────────────────────────────────────────────────────
  sortedSolutions = computed(() =>
    [...this.solutions()].sort((a, b) => {
      if (a.is_accepted && !b.is_accepted) return -1;
      if (!a.is_accepted && b.is_accepted) return 1;
      return b.upvotes - a.upvotes;
    })
  );

  readonly statusSteps: { key: string; label: string }[] = [
    { key: 'reported',    label: 'Reported'    },
    { key: 'verified',    label: 'Verified'    },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'resolved',    label: 'Resolved'    }
  ];

  statusIndex = computed(() => {
    const map: Record<string, number> = { reported: 0, verified: 1, in_progress: 2, resolved: 3 };
    return map[this.issue()?.status ?? 'reported'] ?? 0;
  });

  ngOnInit(): void {
    this.sub = this.route.paramMap.subscribe(params => {
      const id = Number(params.get('id'));
      if (!id) { this.notFound.set(true); this.loading.set(false); return; }
      this.loadPage(id);
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  private loadPage(id: number): void {
    this.loading.set(true);
    forkJoin([
      this.issueSvc.getIssueById(id),
      this.solutionSvc.getSolutionsByIssue(id),
      this.commentSvc.getByIssue(id)
    ]).subscribe(([issue, solutions, comments]) => {
      if (!issue) { this.notFound.set(true); this.loading.set(false); return; }
      this.issue.set(issue);
      this.solutions.set(solutions);
      this.comments.set(comments);
      this.loading.set(false);
    });
  }

  // ── Issue voting ─────────────────────────────────────────────────────────
  vote(type: VoteType): void {
    const issue = this.issue();
    if (!issue || this.voteLoading()) return;
    this.voteLoading.set(true);
    this.issueSvc.voteIssue(issue.id, type).subscribe(updated => {
      this.issue.set(updated);
      this.voteLoading.set(false);
    });
  }

  // ── Solution voting ──────────────────────────────────────────────────────
  voteSolution(solutionId: number): void {
    if (this.solutionVoting()) return;
    this.solutionVoting.set(solutionId);
    const updated = this.solutions().map(s =>
      s.id === solutionId ? { ...s, upvotes: s.upvotes + 1, user_voted: true } : s
    );
    this.solutions.set(updated);
    setTimeout(() => this.solutionVoting.set(null), 400);
  }

  // ── Accept solution ──────────────────────────────────────────────────────
  acceptSolution(solutionId: number): void {
    const issue = this.issue();
    if (!issue) return;
    this.solutionSvc.acceptSolution(solutionId, issue.id).subscribe(() => {
      this.solutions.update(list =>
        list.map(s => ({ ...s, is_accepted: s.id === solutionId }))
      );
    });
  }

  isIssueOwner(): boolean {
    const user  = this.authService.currentUser;
    const issue = this.issue();
    return !!(user && issue && user.id === issue.created_by);
  }

  // ── Update issue status ───────────────────────────────────────────────
  updateStatus(status: string): void {
    const issue = this.issue();
    if (!issue || this.statusLoading() || !this.isIssueOwner()) return;
    if (issue.status === status) return;

    this.statusLoading.set(true);
    this.issueSvc.updateStatus(issue.id, status as any).subscribe({
      next: (updated) => {
        this.issue.set(updated);
        this.statusLoading.set(false);
      },
      error: () => {
        this.statusLoading.set(false);
      }
    });
  }

  // ── Add solution ──────────────────────────────────────────────────────────
  submitSolution(): void {
    this.solutionForm.markAllAsTouched();
    if (this.solutionForm.invalid || this.solutionLoading()) return;
    const user  = this.authService.currentUser;
    const issue = this.issue();
    if (!user || !issue) { this.router.navigate(['/login']); return; }

    this.solutionLoading.set(true);
    const text = this.solutionForm.value.text!.trim();
    this.solutionSvc.addSolution(issue.id, user.id, user.username, text).subscribe(sol => {
      this.solutions.update(list => [...list, sol]);
      this.solutionForm.reset();
      this.solutionLoading.set(false);
    });
  }

  // ── Add comment ────────────────────────────────────────────────────────────
  submitComment(): void {
    this.commentForm.markAllAsTouched();
    if (this.commentForm.invalid || this.commentLoading()) return;
    const user  = this.authService.currentUser;
    const issue = this.issue();
    if (!user || !issue) { this.router.navigate(['/login']); return; }

    this.commentLoading.set(true);
    const text = this.commentForm.value.text!.trim();
    this.commentSvc.add(issue.id, user.id, user.username, text).subscribe(c => {
      this.comments.update(list => [...list, c]);
      this.commentForm.reset();
      this.commentLoading.set(false);
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  categoryIcon(cat: string): string {
    const m: Record<string, string> = { pothole:'🕳️', garbage:'🗑️', water:'💧', electricity:'⚡', other:'📋' };
    return m[cat] ?? '📋';
  }

  categoryLabel(cat: string): string {
    const m: Record<string, string> = { pothole:'Pothole', garbage:'Garbage', water:'Water Supply', electricity:'Electricity', other:'Other' };
    return m[cat] ?? cat;
  }

  timeAgo(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1)  return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  getInitial(name: string): string { return name?.[0]?.toUpperCase() ?? '?'; }

  get solutionTextError(): string {
    const c = this.solutionForm.get('text')!;
    if (!c.touched) return '';
    if (c.hasError('required'))   return 'Please write your solution.';
    if (c.hasError('minlength'))  return 'Solution must be at least 20 characters.';
    if (c.hasError('maxlength'))  return 'Solution must be under 1000 characters.';
    return '';
  }

  get solutionCharCount(): number { return (this.solutionForm.value.text ?? '').length; }
  get commentCharCount():  number { return (this.commentForm.value.text ?? '').length; }
}
