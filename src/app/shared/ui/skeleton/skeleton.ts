import { Component, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  imports: [],
  template: `<div class="animate-pulse rounded-md bg-neutral-200/80" [class]="class()"></div>`,
})
export class Skeleton {
  class = input('h-4 w-full');
}
