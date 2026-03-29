import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatusBadge } from '../status-badge/status-badge';
import { Issue, VoteType } from '../../models/issue.model';

@Component({
  selector: 'app-issue-card',
  imports: [RouterLink, StatusBadge],
  templateUrl: './issue-card.html',
  styleUrl: './issue-card.css'
})
export class IssueCard {
  @Input({ required: true }) issue!: Issue;

  /** Emits when user votes — parent or feed calls IssueService */
  @Output() vote = new EventEmitter<{ issueId: number; type: VoteType }>();

  // ── Derived display values ────────────────────────────────────────────────

  get categoryIcon(): string {
    const icons: Record<string, string> = {
      pothole: '🕳️', garbage: '🗑️', water: '💧', electricity: '⚡', other: '📋'
    };
    return icons[this.issue.category] || '📋';
  }

  get categoryLabel(): string {
    const labels: Record<string, string> = {
      pothole: 'Pothole', garbage: 'Garbage', water: 'Water', electricity: 'Electricity', other: 'Other'
    };
    return labels[this.issue.category] || this.issue.category;
  }

  get timeAgo(): string {
    const now = new Date();
    const created = new Date(this.issue.created_at);
    const diffMs = now.getTime() - created.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return created.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // ── Vote actions ─────────────────────────────────────────────────────────

  onUpvote(event: Event): void {
    event.stopPropagation();  // prevent RouterLink navigation
    event.preventDefault();
    this.vote.emit({ issueId: this.issue.id, type: 'up' });
  }

  onDownvote(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.vote.emit({ issueId: this.issue.id, type: 'down' });
  }
}
