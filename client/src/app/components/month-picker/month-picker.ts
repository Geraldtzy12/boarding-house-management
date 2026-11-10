import { Component, computed, model } from '@angular/core';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

@Component({
  selector: 'app-month-picker',
  templateUrl: './month-picker.html',
  styleUrl: './month-picker.css'
})
export class MonthPicker {
  value = model<string>('');   // 'yyyy-MM', two-way [(value)]

  label = computed(() => {
    const [y, m] = (this.value() || thisMonth()).split('-').map(Number);
    return `${MONTHS[m - 1]} ${y}`;
  });

  shift(delta: number) {
    const [y, m] = (this.value() || thisMonth()).split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    this.value.set(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }
}