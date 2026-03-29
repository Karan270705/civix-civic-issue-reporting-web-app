import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { delay } from 'rxjs/operators';
import { Comment } from '../models/comment.model';

const STORAGE_KEY = 'civix_comments';
const API_DELAY   = 400;

const SEED: Comment[] = [
  { id: 1,  issue_id: 1, user_id: 5, text: 'I drive through here every day — it\'s gotten way worse. Saw a bike tire go flat right there yesterday.', created_at: new Date(Date.now() - 90 * 60000).toISOString(), username: 'vikram_r' },
  { id: 2,  issue_id: 1, user_id: 6, text: 'Called BBMP three days ago, they said they\'d get to it "soon". Classic.', created_at: new Date(Date.now() - 45 * 60000).toISOString(), username: 'deepa_s' },
  { id: 3,  issue_id: 2, user_id: 1, text: 'The smell is absolutely terrible near the park entrance. Kids play there!', created_at: new Date(Date.now() - 3 * 3600000).toISOString(), username: 'rahul_dev' },
  { id: 4,  issue_id: 3, user_id: 7, text: 'Street is literally a river now. My car got stuck this morning.', created_at: new Date(Date.now() - 18 * 3600000).toISOString(), username: 'suresh_k' },
  { id: 5,  issue_id: 3, user_id: 8, text: 'I think a main pipe burst underground. This isn\'t just a small leak.', created_at: new Date(Date.now() - 15 * 3600000).toISOString(), username: 'meera_r' },
  { id: 6,  issue_id: 6, user_id: 2, text: 'This is terrifying. There are schools nearby — someone has to fix it NOW.', created_at: new Date(Date.now() - 8 * 3600000).toISOString(), username: 'priya_93' },
];

@Injectable({ providedIn: 'root' })
export class CommentService {
  private _comments$ = new BehaviorSubject<Comment[]>(this.load());

  getByIssue(issueId: number): Observable<Comment[]> {
    return of(this._comments$.getValue()
      .filter(c => c.issue_id === issueId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    ).pipe(delay(API_DELAY));
  }

  add(issueId: number, userId: number, username: string, text: string): Observable<Comment> {
    const list = this._comments$.getValue();
    const newId = list.length > 0 ? Math.max(...list.map(c => c.id)) + 1 : 1;
    const c: Comment = { id: newId, issue_id: issueId, user_id: userId, text, created_at: new Date().toISOString(), username };
    this.push([...list, c]);
    return of(c).pipe(delay(API_DELAY));
  }

  private push(c: Comment[]) {
    this._comments$.next(c);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch { }
  }

  private load(): Comment[] {
    try {
      const r = localStorage.getItem(STORAGE_KEY);
      if (r) { const p = JSON.parse(r); if (p.length > 0) return p; }
    } catch { }
    return SEED;
  }
}
