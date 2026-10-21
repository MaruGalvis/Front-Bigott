import { Component, input } from '@angular/core';
import { SalesTargetGrid } from '../../../../core/models/sales-target.model';
import { NumberEsPipe } from '../../../../shared/pipes/number-es.pipe';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';

@Component({
  selector: 'app-sales-target-table',
  imports: [NumberEsPipe, EmptyState],
  templateUrl: './sales-target-table.html',
})
export class SalesTargetTable {
  grid = input<SalesTargetGrid | null>(null);
}
