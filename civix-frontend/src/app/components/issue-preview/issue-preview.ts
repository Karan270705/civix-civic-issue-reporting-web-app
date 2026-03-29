import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IssueCard } from '../issue-card/issue-card';
import { IssueService } from '../../services/issue';
import { Issue, VoteType } from '../../models/issue.model';

@Component({
  selector: 'app-issue-preview',
  imports: [IssueCard, RouterLink],
  templateUrl: './issue-preview.html',
  styleUrl: './issue-preview.css'
})
export class IssuePreview implements OnInit {
  previewIssues = signal<Issue[]>([]);

  constructor(private issueService: IssueService) {}

  ngOnInit(): void {
    // Take first 4 issues sorted by most voted for the landing preview
    this.issueService.getIssues().subscribe(issues => {
      const sorted = [...issues].sort((a, b) => b.vote_count - a.vote_count);
      this.previewIssues.set(sorted.slice(0, 4));
    });
  }

  onVote(event: { issueId: number; type: VoteType }): void {
    this.issueService.voteIssue(event.issueId, event.type).subscribe(updated => {
      this.previewIssues.update(issues =>
        issues.map(i => i.id === updated.id ? updated : i)
      );
    });
  }
}
