import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { IssueCard } from '../../components/issue-card/issue-card';
import { IssueService } from '../../services/issue';
import { Issue, IssueFilter, IssueCategory, IssueStatus, VoteType } from '../../models/issue.model';

@Component({
  selector: 'app-feed',
  imports: [IssueCard, RouterLink],
  templateUrl: './feed.html',
  styleUrl: './feed.css'
})
export class Feed implements OnInit, OnDestroy {
  private sub?: Subscription;

  // ── State ────────────────────────────────────────────────────────────────
  loading = signal(true);
  allIssues = signal<Issue[]>([]);

  filter = signal<IssueFilter>({
    category: 'all',
    status: 'all',
    sort: 'newest'
  });

  // ── Derived: filter applied client-side off the service BehaviorSubject ──
  filteredIssues = computed(() =>
    this.issueService.applyFilter(this.allIssues(), this.filter())
  );

  // ── Filter options ───────────────────────────────────────────────────────
  readonly categories: { value: IssueCategory | 'all'; label: string; icon: string }[] = [
    { value: 'all',         label: 'All Categories', icon: '📌' },
    { value: 'pothole',     label: 'Pothole',         icon: '🕳️' },
    { value: 'garbage',     label: 'Garbage',         icon: '🗑️' },
    { value: 'water',       label: 'Water',           icon: '💧' },
    { value: 'electricity', label: 'Electricity',     icon: '⚡' },
    { value: 'other',       label: 'Other',           icon: '📋' }
  ];

  readonly statuses: { value: IssueStatus | 'all'; label: string }[] = [
    { value: 'all',         label: 'All Statuses'  },
    { value: 'reported',    label: 'Reported'      },
    { value: 'verified',    label: 'Verified'      },
    { value: 'in_progress', label: 'In Progress'   },
    { value: 'resolved',    label: 'Resolved'      }
  ];

  constructor(private issueService: IssueService) {}

  ngOnInit(): void {
    // Subscribe to live BehaviorSubject — updates whenever any vote happens
    this.sub = this.issueService.issues$.subscribe(issues => {
      this.allIssues.set(issues);
      this.loading.set(false);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // ── Filter actions ───────────────────────────────────────────────────────

  setCategory(value: string): void {
    this.filter.update(f => ({ ...f, category: value as IssueCategory | 'all' }));
  }

  setStatus(value: string): void {
    this.filter.update(f => ({ ...f, status: value as IssueStatus | 'all' }));
  }

  setSort(value: string): void {
    this.filter.update(f => ({ ...f, sort: value as 'newest' | 'most_voted' }));
  }

  setActiveCategory(value: IssueCategory | 'all'): void {
    this.filter.update(f => ({ ...f, category: value }));
  }

  // ── Vote handler — delegates to service ─────────────────────────────────

  onVote(event: { issueId: number; type: VoteType }): void {
    this.issueService.voteIssue(event.issueId, event.type).subscribe();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  trackById(_index: number, issue: Issue): number {
    return issue.id;
  }
}
