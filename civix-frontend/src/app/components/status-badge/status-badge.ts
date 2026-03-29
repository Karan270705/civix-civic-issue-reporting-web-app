import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  imports: [],
  templateUrl: './status-badge.html',
  styleUrl: './status-badge.css'
})
export class StatusBadge {
  @Input() status: string = 'reported';

  get label(): string {
    const labels: Record<string, string> = {
      reported: 'Reported',
      verified: 'Verified',
      in_progress: 'In Progress',
      resolved: 'Resolved'
    };
    return labels[this.status] || this.status;
  }
}
