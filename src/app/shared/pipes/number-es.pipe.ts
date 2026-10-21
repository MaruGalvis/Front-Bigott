import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'numberEs' })
export class NumberEsPipe implements PipeTransform {
  transform(value: number | null | undefined, decimals = 2): string {
    if (value === null || value === undefined || Number.isNaN(value)) return '-';
    if (value === 0) return '-';
    return value.toLocaleString('es-VE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
}
