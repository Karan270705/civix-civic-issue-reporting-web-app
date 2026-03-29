import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { Issue, IssueCategory, IssueStatus, IssueFilter, VoteType, CreateIssuePayload, SortOption } from '../models/issue.model';

const STORAGE_KEY = 'civix_issues';
const API_DELAY_MS = 600; // simulates network latency

// ─── Seed data ────────────────────────────────────────────────────────────────
const SEED_ISSUES: Issue[] = [
  {
    id: 1,
    title: 'Massive pothole on MG Road near Central Mall',
    description: 'A large pothole has appeared right near the Central Mall junction. It\'s causing traffic jams and is dangerous for two-wheelers. Multiple accidents have been reported in the past week alone.',
    image_url: null,
    location: 'MG Road, Bangalore',
    lat: 12.9716, lng: 77.5946,
    category: 'pothole',
    status: 'verified',
    created_by: 1,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    username: 'rahul_dev',
    vote_count: 24,
    user_vote: null
  },
  {
    id: 2,
    title: 'Garbage dump overflowing near Residency Park',
    description: 'The garbage collection point at Residency Park hasn\'t been cleared in over a week. It\'s attracting stray animals and the smell is unbearable for nearby residents and commuters.',
    image_url: null,
    location: 'Residency Park, Pune',
    lat: 18.5204, lng: 73.8567,
    category: 'garbage',
    status: 'reported',
    created_by: 2,
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    username: 'priya_93',
    vote_count: 12,
    user_vote: null
  },
  {
    id: 3,
    title: 'Water pipeline leak flooding Sector 15 streets',
    description: 'A major pipeline is leaking continuously and has been flooding the streets for 3 days. Water supply in the area is also intermittent. Vehicles can\'t pass through the main road.',
    image_url: null,
    location: 'Sector 15, Noida',
    lat: 28.5355, lng: 77.3910,
    category: 'water',
    status: 'in_progress',
    created_by: 3,
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    username: 'amit_kh',
    vote_count: 45,
    user_vote: null
  },
  {
    id: 4,
    title: 'Street lights non-functional on Ring Road',
    description: 'All street lights on the stretch between KR Circle and Majestic have been non-functional for over 2 weeks. This is a safety hazard especially for pedestrians at night.',
    image_url: null,
    location: 'Ring Road, Bangalore',
    lat: 12.9767, lng: 77.5713,
    category: 'electricity',
    status: 'reported',
    created_by: 4,
    created_at: new Date(Date.now() - 72 * 3600000).toISOString(),
    username: 'sneha_m',
    vote_count: 8,
    user_vote: null
  },
  {
    id: 5,
    title: 'Broken footpath tiles outside Andheri Metro Station',
    description: 'Multiple footpath tiles near the Andheri Station exit are cracked and raised. Commuters, especially elderly and children, are tripping and getting injured during rush hours.',
    image_url: null,
    location: 'Andheri, Mumbai',
    lat: 19.1136, lng: 72.8697,
    category: 'other',
    status: 'resolved',
    created_by: 5,
    created_at: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
    username: 'vikram_r',
    vote_count: 31,
    user_vote: null
  },
  {
    id: 6,
    title: 'Open manhole on Station Road — child nearly fell in',
    description: 'A manhole cover has been missing for 4 days on the busy Station Road. A child nearly fell in yesterday. This is extremely dangerous especially after dark.',
    image_url: null,
    location: 'Station Road, Chennai',
    lat: 13.0827, lng: 80.2707,
    category: 'other',
    status: 'verified',
    created_by: 6,
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    username: 'deepa_s',
    vote_count: 52,
    user_vote: null
  },
  {
    id: 7,
    title: 'Contaminated tap water in Koramangala Block 7',
    description: 'Tap water in Block 7 has turned yellowish and has a foul smell since last Thursday. Residents have been forced to buy bottled water. No response from BWSSB yet.',
    image_url: null,
    location: 'Koramangala Block 7, Bangalore',
    lat: 12.9352, lng: 77.6245,
    category: 'water',
    status: 'reported',
    created_by: 7,
    created_at: new Date(Date.now() - 36 * 3600000).toISOString(),
    username: 'suresh_k',
    vote_count: 19,
    user_vote: null
  },
  {
    id: 8,
    title: 'Repeated power cuts in Whitefield every evening',
    description: 'Power goes out almost every evening between 6–9 PM in the Whitefield IT corridor area. Multiple complaints lodged with BESCOM with no resolution. Affects thousands of residents.',
    image_url: null,
    location: 'Whitefield, Bangalore',
    lat: 12.9698, lng: 77.7499,
    category: 'electricity',
    status: 'in_progress',
    created_by: 8,
    created_at: new Date(Date.now() - 4 * 24 * 3600000).toISOString(),
    username: 'meera_r',
    vote_count: 67,
    user_vote: null
  }
];

@Injectable({ providedIn: 'root' })
export class IssueService {
  // ── Internal state ──────────────────────────────────────────────────────────
  private _issues$ = new BehaviorSubject<Issue[]>(this.loadFromStorage());

  /** Public observable for components to subscribe to */
  issues$: Observable<Issue[]> = this._issues$.asObservable();

  // ── Read ────────────────────────────────────────────────────────────────────

  /** Get all issues — simulates API delay */
  getIssues(): Observable<Issue[]> {
    return of(this._issues$.getValue()).pipe(delay(API_DELAY_MS));
  }

  /** Get a single issue by id — simulates API delay */
  getIssueById(id: number): Observable<Issue | undefined> {
    return of(this._issues$.getValue().find(i => i.id === id)).pipe(delay(API_DELAY_MS));
  }

  /** Get filtered + sorted slice for feed */
  getFilteredIssues(filter: IssueFilter): Observable<Issue[]> {
    return this.issues$.pipe(
      map(issues => this.applyFilter(issues, filter))
    );
  }

  /** Get all issues posted by a specific user */
  getIssuesByUser(userId: number): Observable<Issue[]> {
    const result = this._issues$.getValue().filter(i => i.created_by === userId);
    return of(result).pipe(delay(API_DELAY_MS));
  }


  // ── Write ───────────────────────────────────────────────────────────────────

  /** Add a new issue. Returns the created issue. */
  addIssue(payload: CreateIssuePayload, userId: number, username: string): Observable<Issue> {
    const current = this._issues$.getValue();
    const newId = current.length > 0 ? Math.max(...current.map(i => i.id)) + 1 : 1;

    const newIssue: Issue = {
      id: newId,
      title: payload.title,
      description: payload.description,
      image_url: payload.image_url ?? null,
      location: payload.location,
      lat: payload.lat ?? null,
      lng: payload.lng ?? null,
      category: payload.category,
      status: 'reported',
      created_by: userId,
      created_at: new Date().toISOString(),
      username,
      vote_count: 0,
      user_vote: null
    };

    const updated = [newIssue, ...current];
    this.pushUpdate(updated);

    return of(newIssue).pipe(delay(API_DELAY_MS));
  }

  /**
   * Vote on an issue.
   * - Same vote type again → toggles off (removes vote)
   * - Opposite vote type → switches vote (count changes by 2)
   */
  voteIssue(issueId: number, voteType: VoteType): Observable<Issue> {
    const current = this._issues$.getValue();
    const updated = current.map(issue => {
      if (issue.id !== issueId) return issue;

      let count = issue.vote_count;
      let userVote: VoteType | null = issue.user_vote;

      if (userVote === voteType) {
        // Toggle off
        count += voteType === 'up' ? -1 : 1;
        userVote = null;
      } else {
        // Remove previous vote first
        if (userVote !== null) {
          count += userVote === 'up' ? -1 : 1;
        }
        // Apply new vote
        count += voteType === 'up' ? 1 : -1;
        userVote = voteType;
      }

      // Auto-verify when net upvotes reach threshold
      const newStatus = count >= 10 && issue.status === 'reported' ? 'verified' : issue.status;

      return { ...issue, vote_count: count, user_vote: userVote, status: newStatus };
    });

    this.pushUpdate(updated);
    const result = updated.find(i => i.id === issueId)!;
    return of(result).pipe(delay(200)); // faster for votes — feels instant
  }

  /** Update an issue's status (creator only — guard this in a real app) */
  updateStatus(issueId: number, status: IssueStatus): Observable<Issue> {
    const current = this._issues$.getValue();
    const updated = current.map(i => i.id === issueId ? { ...i, status } : i);
    this.pushUpdate(updated);
    const result = updated.find(i => i.id === issueId)!;
    return of(result).pipe(delay(API_DELAY_MS));
  }

  // ── Filter/sort logic ───────────────────────────────────────────────────────

  applyFilter(issues: Issue[], filter: IssueFilter): Issue[] {
    let result = [...issues];

    if (filter.category !== 'all') {
      result = result.filter(i => i.category === filter.category);
    }
    if (filter.status !== 'all') {
      result = result.filter(i => i.status === filter.status);
    }
    if (filter.sort === 'newest') {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      result.sort((a, b) => b.vote_count - a.vote_count);
    }

    return result;
  }

  // ── Storage helpers ─────────────────────────────────────────────────────────

  private pushUpdate(issues: Issue[]): void {
    this._issues$.next(issues);
    this.saveToStorage(issues);
  }

  private saveToStorage(issues: Issue[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
    } catch { /* quota exceeded — silently ignore */ }
  }

  private loadFromStorage(): Issue[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Issue[] = JSON.parse(raw);
        // If stored data is empty or outdated, re-seed
        if (parsed.length > 0) return parsed;
      }
    } catch { /* corrupted storage */ }
    this.saveToStorage(SEED_ISSUES);
    return SEED_ISSUES;
  }

  /** Dev utility: reset to seed data */
  resetToSeed(): void {
    this.pushUpdate(SEED_ISSUES);
  }
}
