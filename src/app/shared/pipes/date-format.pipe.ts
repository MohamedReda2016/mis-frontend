import { Pipe, PipeTransform } from '@angular/core';

/** Converts a YYYY-MM-DD string to DD/MM/YYYY. Returns '—' for falsy input. */
@Pipe({ name: 'dateFormat' })
export class DateFormatPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '—';
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
}
