import { Component, computed, effect, input, output, signal } from '@angular/core';
import { WeekMeta } from '../../../../core/models/weekly-sales-distribution.model';

@Component({
  selector: 'app-week-strip',
  imports: [],
  templateUrl: './week-strip.html',
})
export class WeekStrip {
  weeks = input.required<WeekMeta[]>();
  readonlyMode = input(false);

  weightChanged = output<{ weekIndex: number; value: number }>();
  daysChanged = output<{ weekIndex: number; value: number }>();

  /** Live draft of the weight percentages, updated on every keystroke so the 100%
   * indicator reacts instantly instead of waiting for the autosave round trip.
   * Cleared back to null whenever fresh saved data arrives from the server. */
  private readonly draftWeights = signal<number[] | null>(null);

  readonly displayWeights = computed(() => this.draftWeights() ?? this.weeks().map((w) => w.weightPercent));
  readonly totalWeight = computed(() => this.displayWeights().reduce((sum, v) => sum + (v || 0), 0));
  readonly totalDays = computed(() => this.weeks().reduce((sum, w) => sum + (w.days || 0), 0));

  constructor() {
    effect(() => {
      this.weeks();
      this.draftWeights.set(null);
    });
  }

  onWeightTyping(weekIndex: number, raw: string): void {
    const next = [...this.displayWeights()];
    next[weekIndex] = Number(raw) || 0;
    this.draftWeights.set(next);
  }

  onWeightInput(weekIndex: number, raw: string): void {
    this.weightChanged.emit({ weekIndex, value: Number(raw) || 0 });
  }

  onDaysInput(weekIndex: number, raw: string): void {
    this.daysChanged.emit({ weekIndex, value: Number(raw) || 0 });
  }
}
