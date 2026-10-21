import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RegionService } from '../../../../core/services/region.service';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-region-panel',
  imports: [ReactiveFormsModule, FormsModule, Skeleton, EmptyState],
  templateUrl: './region-panel.html',
})
export class RegionPanel implements OnInit {
  private readonly fb = new FormBuilder();
  private readonly regionService = inject(RegionService);
  private readonly toast = inject(ToastService);

  readonly items = this.regionService.items;
  readonly loadingList = this.regionService.loading;

  saving = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  search = signal('');

  filteredItems = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.items();
    return this.items().filter((r) => r.name.toLowerCase().includes(term));
  });

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
  });

  ngOnInit(): void {
    this.regionService.load();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name } = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.success.set(false);

    this.regionService.create({ name }).subscribe({
      next: (region) => {
        this.saving.set(false);
        this.success.set(true);
        this.form.reset();
        setTimeout(() => this.success.set(false), 3500);
        this.toast.success('¡Nueva región agregada!', `${region.name} ya aparece disponible en tus reportes.`);
      },
      error: (err) => {
        this.saving.set(false);
        const message = err?.error?.message ?? 'No se pudo crear la región.';
        this.error.set(message);
        this.toast.error('No pudimos crear tu región', message);
      },
    });
  }
}
