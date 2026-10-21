import { Component, ElementRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { BranchService } from '../../../../core/services/branch.service';
import { RegionService } from '../../../../core/services/region.service';
import { Branch, Region } from '../../../../core/models/catalog.model';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-branch-panel',
  imports: [ReactiveFormsModule, FormsModule, Skeleton, EmptyState],
  templateUrl: './branch-panel.html',
})
export class BranchPanel implements OnInit {
  private readonly fb = new FormBuilder();
  private readonly branchService = inject(BranchService);
  private readonly regionService = inject(RegionService);
  private readonly elementRef = inject(ElementRef);
  private readonly toast = inject(ToastService);

  readonly items = this.branchService.items;
  readonly loadingList = this.branchService.loading;
  readonly regions = this.regionService.items;

  saving = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  regionMenuOpen = signal(false);
  search = signal('');

  filteredItems = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.items();
    return this.items().filter(
      (b) => b.name.toLowerCase().includes(term) || this.regionName(b).toLowerCase().includes(term),
    );
  });

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    regionId: this.fb.control<string | null>(null, Validators.required),
  });

  ngOnInit(): void {
    this.branchService.load();
    this.regionService.load();
  }

  selectedRegionName(): string {
    const id = this.form.controls.regionId.value;
    return this.regions().find((r) => r.regionId === id)?.name ?? 'Selecciona una región';
  }

  selectRegion(region: Region): void {
    this.form.controls.regionId.setValue(region.regionId);
    this.regionMenuOpen.set(false);
  }

  regionName(branch: Branch): string {
    return branch.region?.name ?? this.regions().find((r) => r.regionId === branch.regionId)?.name ?? '—';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.regionMenuOpen.set(false);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, regionId } = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.success.set(false);

    this.branchService.create({ name, regionId: regionId! }).subscribe({
      next: (branch) => {
        this.saving.set(false);
        this.success.set(true);
        this.form.reset();
        setTimeout(() => this.success.set(false), 3500);
        this.toast.success('¡Nueva sucursal agregada!', `${branch.name} ya está lista para operar.`);
      },
      error: (err) => {
        this.saving.set(false);
        const message = err?.error?.message ?? 'No se pudo crear la sucursal.';
        this.error.set(message);
        this.toast.error('No pudimos crear tu sucursal', message);
      },
    });
  }
}
