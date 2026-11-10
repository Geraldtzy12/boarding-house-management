import { Component, computed, effect, input, model, signal } from '@angular/core';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

@Component({
  selector: 'app-date-picker',
  templateUrl: './date-picker.html',
  styleUrl: './date-picker.css'
})
export class DatePicker {
  value = model<string>('');                       // 'yyyy-MM-dd', two-way [(value)]
  placeholder = input('Pumili ng petsa');

  open = signal(false);
  viewYear = signal(new Date().getFullYear());
  viewMonth = signal(new Date().getMonth());       // 0 = January

  weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  title = computed(() => `${MONTHS[this.viewMonth()]} ${this.viewYear()}`);

  label = computed(() => {
    const v = this.value();
    if (!v) return '';
    const [y, m, d] = v.split('-').map(Number);
    return `${MONTHS[m - 1].slice(0, 3)} ${d}, ${y}`;
  });

  // mga araw ng buwan (may blangkong puwesto sa umpisa para sa tamang araw ng linggo)
  cells = computed(() => {
    const y = this.viewYear();
    const m = this.viewMonth();
    const firstWeekday = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const list: (number | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= daysInMonth; d++) list.push(d);
    return list;
  });

  constructor() {
    // kapag may napiling petsa, ang kalendaryo ay nasa buwan nun
    effect(() => {
      const v = this.value();
      if (v) {
        const [y, m] = v.split('-').map(Number);
        this.viewYear.set(y);
        this.viewMonth.set(m - 1);
      }
    });
  }

  toggle() {
    this.open.update(o => !o);
  }

  prev() {
    if (this.viewMonth() === 0) {
      this.viewMonth.set(11);
      this.viewYear.update(y => y - 1);
    } else {
      this.viewMonth.update(m => m - 1);
    }
  }

  next() {
    if (this.viewMonth() === 11) {
      this.viewMonth.set(0);
      this.viewYear.update(y => y + 1);
    } else {
      this.viewMonth.update(m => m + 1);
    }
  }

  select(day: number) {
    this.value.set(toIso(this.viewYear(), this.viewMonth(), day));
    this.open.set(false);
  }

  pickToday() {
    const t = new Date();
    this.value.set(toIso(t.getFullYear(), t.getMonth(), t.getDate()));
    this.open.set(false);
  }

  isSelected(day: number): boolean {
    return this.value() === toIso(this.viewYear(), this.viewMonth(), day);
  }

  isToday(day: number): boolean {
    const t = new Date();
    return toIso(t.getFullYear(), t.getMonth(), t.getDate()) === toIso(this.viewYear(), this.viewMonth(), day);
  }
}