import { Component, computed, input } from '@angular/core';
import { Skeleton } from './skeleton';

@Component({
  selector: 'app-table-skeleton',
  imports: [Skeleton],
  templateUrl: './table-skeleton.html',
})
export class TableSkeleton {
  rows = input(5);
  cols = input(6);

  readonly rowIndexes = computed(() => Array.from({ length: this.rows() }));
  readonly colIndexes = computed(() => Array.from({ length: this.cols() }));
}
