import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Solution } from '../models/solution.model';

const STORAGE_KEY = 'civix_solutions';
const API_DELAY = 500;

const SEED_SOLUTIONS: Solution[] = [
  { id: 1, issue_id: 1, user_id: 2, solution_text: 'Contact BBMP road maintenance division via their grievance portal. Attach this post link and the GPS coordinates.', created_at: new Date(Date.now() - 1 * 3600000).toISOString(), username: 'priya_93', upvotes: 14, user_voted: false, is_accepted: true },
  { id: 2, issue_id: 1, user_id: 3, solution_text: 'Reach out to the local corporator directly. Ward 75 MLA office can fast-track road repair requests.', created_at: new Date(Date.now() - 2 * 3600000).toISOString(), username: 'amit_kh', upvotes: 9, user_voted: false, is_accepted: false },
  { id: 3, issue_id: 2, user_id: 1, solution_text: 'File a complaint on the BBMP SWM app. Include photos. They guaranty a 48-hour response window.', created_at: new Date(Date.now() - 6 * 3600000).toISOString(), username: 'rahul_dev', upvotes: 7, user_voted: false, is_accepted: false },
  { id: 4, issue_id: 3, user_id: 4, solution_text: 'This needs to be reported to Noida Authority\'s 24-hour helpline: 0120-6516001. Tag them on Twitter too.', created_at: new Date(Date.now() - 20 * 3600000).toISOString(), username: 'sneha_m', upvotes: 18, user_voted: false, is_accepted: true },
  { id: 5, issue_id: 6, user_id: 1, solution_text: 'Chennai Corp has a 24x7 control room. Call 1913. This is an emergency and should be escalated immediately.', created_at: new Date(Date.now() - 10 * 3600000).toISOString(), username: 'rahul_dev', upvotes: 22, user_voted: false, is_accepted: true },
  { id: 6, issue_id: 7, user_id: 3, solution_text: 'BWSSB helpline is 1916. You can also complain via WhatsApp at 94483 94839. Include your connection ID.', created_at: new Date(Date.now() - 30 * 3600000).toISOString(), username: 'amit_kh', upvotes: 11, user_voted: false, is_accepted: false },
];

@Injectable({ providedIn: 'root' })
export class SolutionService {
  private _solutions$ = new BehaviorSubject<Solution[]>(this.loadFromStorage());

  solutions$: Observable<Solution[]> = this._solutions$.asObservable();

  // ─── Read ─────────────────────────────────────────────────────────────────

  getSolutionsByIssue(issueId: number): Observable<Solution[]> {
    const result = this._solutions$.getValue().filter(s => s.issue_id === issueId);
    return of(result).pipe(delay(API_DELAY));
  }

  getSolutionsByUser(userId: number): Observable<Solution[]> {
    const result = this._solutions$.getValue().filter(s => s.user_id === userId);
    return of(result).pipe(delay(API_DELAY));
  }

  // ─── Write ────────────────────────────────────────────────────────────────

  addSolution(issueId: number, userId: number, username: string, text: string): Observable<Solution> {
    const current = this._solutions$.getValue();
    const newId = current.length > 0 ? Math.max(...current.map(s => s.id)) + 1 : 1;
    const newSol: Solution = {
      id: newId, issue_id: issueId, user_id: userId,
      solution_text: text, created_at: new Date().toISOString(),
      username, upvotes: 0, user_voted: false, is_accepted: false
    };
    this.pushUpdate([...current, newSol]);
    return of(newSol).pipe(delay(API_DELAY));
  }

  acceptSolution(solutionId: number, issueId: number): Observable<Solution> {
    const updated = this._solutions$.getValue().map(s => {
      if (s.issue_id === issueId) return { ...s, is_accepted: s.id === solutionId };
      return s;
    });
    this.pushUpdate(updated);
    return of(updated.find(s => s.id === solutionId)!).pipe(delay(API_DELAY));
  }

  // ─── Storage ──────────────────────────────────────────────────────────────

  private pushUpdate(solutions: Solution[]): void {
    this._solutions$.next(solutions);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(solutions)); } catch { }
  }

  private loadFromStorage(): Solution[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Solution[] = JSON.parse(raw);
        if (parsed.length > 0) return parsed;
      }
    } catch { }
    return SEED_SOLUTIONS;
  }
}
