import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Branch } from '../models/catalog.model';

export interface CreateBranchPayload {
  name: string;
  regionId: string;
}

interface PaginatedResult<T> {
  data: T[];
}

@Injectable({ providedIn: 'root' })
export class BranchService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/branch`;

  private readonly itemsSignal = signal<Branch[]>([]);
  readonly items = this.itemsSignal.asReadonly();

  private readonly loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  load(): void {
    this.loadingSignal.set(true);
    this.http.get<Branch[] | PaginatedResult<Branch>>(this.baseUrl, { params: { limit: '100' } }).subscribe({
      next: (res) => {
        this.itemsSignal.set(Array.isArray(res) ? res : res.data);
        this.loadingSignal.set(false);
      },
      error: () => this.loadingSignal.set(false),
    });
  }

  create(payload: CreateBranchPayload): Observable<Branch> {
    return this.http
      .post<Branch>(this.baseUrl, payload)
      .pipe(tap((branch) => this.itemsSignal.update((list) => [branch, ...list])));
  }
}
