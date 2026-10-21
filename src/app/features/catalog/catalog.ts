import { Component, signal } from '@angular/core';
import { PageHeader } from '../../shared/ui/page-header/page-header';
import { ProductPanel } from './components/product-panel/product-panel';
import { RegionPanel } from './components/region-panel/region-panel';
import { BranchPanel } from './components/branch-panel/branch-panel';

type CatalogTab = 'product' | 'region' | 'branch';

@Component({
  selector: 'app-catalog',
  imports: [PageHeader, ProductPanel, RegionPanel, BranchPanel],
  templateUrl: './catalog.html',
})
export class Catalog {
  activeTab = signal<CatalogTab>('product');

  setTab(tab: CatalogTab): void {
    this.activeTab.set(tab);
  }
}
