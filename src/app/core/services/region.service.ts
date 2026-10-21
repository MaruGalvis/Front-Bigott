import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Region } from '../models/catalog.model';

export interface CreateRegionPayload {
  name: string;
}

interface PaginatedResult<T> {
  data: T[];
}

@Injectable({ providedIn: 'root' })
export class RegionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/region`;

  private readonly itemsSignal = signal<Region[]>([]);
  readonly items = this.itemsSignal.asReadonly();

  private readonly loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  load(): void {
    this.loadingSignal.set(true);
    this.http.get<Region[] | PaginatedResult<Region>>(this.baseUrl, { params: { limit: '100' } }).subscribe({
      next: (res) => {
        this.itemsSignal.set(Array.isArray(res) ? res : res.data);
        this.loadingSignal.set(false);
      },
      error: () => this.loadingSignal.set(false),
    });
  }

  create(payload: CreateRegionPayload): Observable<Region> {
    return this.http
      .post<Region>(this.baseUrl, payload)
      .pipe(tap((region) => this.itemsSignal.update((list) => [region, ...list])));
  }
}
