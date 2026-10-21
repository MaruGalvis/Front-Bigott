import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  imports: [],
  templateUrl: './empty-state.html',
})
export class EmptyState {
  icon = input('pi-inbox');
  title = input.required<string>();
  description = input<string | null>(null);
  actionLabel = input<string | null>(null);

  action = output<void>();
}
