import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PackType, Product } from '../models/catalog.model';

export interface CreateProductPayload {
  name: string;
  description: string;
  type: PackType;
}

interface PaginatedResult<T> {
  data: T[];
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/product`;

  private readonly itemsSignal = signal<Product[]>([]);
  readonly items = this.itemsSignal.asReadonly();

  private readonly loadingSignal = signal(false);
  readonly loading = this.loadingSignal.asReadonly();

  load(): void {
    this.loadingSignal.set(true);
    this.http.get<Product[] | PaginatedResult<Product>>(this.baseUrl, { params: { limit: '100' } }).subscribe({
      next: (res) => {
        this.itemsSignal.set(Array.isArray(res) ? res : res.data);
        this.loadingSignal.set(false);
      },
      error: () => this.loadingSignal.set(false),
    });
  }

  create(payload: CreateProductPayload): Observable<Product> {
    return this.http
      .post<Product>(this.baseUrl, payload)
      .pipe(tap((product) => this.itemsSignal.update((list) => [product, ...list])));
  }
}
