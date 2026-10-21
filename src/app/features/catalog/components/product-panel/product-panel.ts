import { Component, ElementRef, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../../core/services/product.service';
import { PACK_TYPE_OPTIONS, PackType } from '../../../../core/models/catalog.model';
import { ToastService } from '../../../../shared/ui/toast/toast.service';
import { Skeleton } from '../../../../shared/ui/skeleton/skeleton';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-product-panel',
  imports: [ReactiveFormsModule, FormsModule, Skeleton, EmptyState],
  templateUrl: './product-panel.html',
})
export class ProductPanel implements OnInit {
  private readonly fb = new FormBuilder();
  private readonly productService = inject(ProductService);
  private readonly elementRef = inject(ElementRef);
  private readonly toast = inject(ToastService);

  readonly items = this.productService.items;
  readonly loadingList = this.productService.loading;
  readonly packTypeOptions = PACK_TYPE_OPTIONS;

  saving = signal(false);
  error = signal<string | null>(null);
  success = signal(false);
  typeMenuOpen = signal(false);
  search = signal('');

  filteredItems = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) return this.items();
    return this.items().filter(
      (p) => p.name.toLowerCase().includes(term) || p.description.toLowerCase().includes(term),
    );
  });

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    description: ['', Validators.required],
    type: this.fb.control<PackType | null>(null, Validators.required),
  });

  ngOnInit(): void {
    this.productService.load();
  }

  typeLabel(value: PackType | null): string {
    return this.packTypeOptions.find((o) => o.value === value)?.label ?? 'Selecciona un tipo';
  }

  selectType(value: PackType): void {
    this.form.controls.type.setValue(value);
    this.typeMenuOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.typeMenuOpen.set(false);
    }
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, description, type } = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.success.set(false);

    this.productService.create({ name, description, type: type! }).subscribe({
      next: (product) => {
        this.saving.set(false);
        this.success.set(true);
        this.form.reset();
        setTimeout(() => this.success.set(false), 3500);
        this.toast.success('¡Nuevo producto en el catálogo!', `${product.name} ya está listo para usarse en tus reportes.`);
      },
      error: (err) => {
        this.saving.set(false);
        const message = err?.error?.message ?? 'No se pudo crear el producto.';
        this.error.set(message);
        this.toast.error('No pudimos crear tu producto', message);
      },
    });
  }
}
