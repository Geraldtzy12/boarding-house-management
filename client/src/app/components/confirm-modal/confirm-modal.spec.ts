import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmModal } from './confirm-modal';

// Host component so we can test the projected content (<ng-content />).
@Component({
  imports: [ConfirmModal],
  template: `<app-confirm-modal title="Delete this bill?" confirmLabel="Delete"
    (confirmed)="onConfirmed()" (cancelled)="onCancelled()">
    <p class="projected">Juan Dela Cruz · Rent · Room 101</p>
  </app-confirm-modal>`
})
class Host {
  confirmed = false;
  cancelled = false;
  onConfirmed() { this.confirmed = true; }
  onCancelled() { this.cancelled = true; }
}

describe('ConfirmModal', () => {
  let fixture: ComponentFixture<Host>;
  let host: Host;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
    fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.nativeElement.querySelector('.confirm-modal')).toBeTruthy();
  });

  it('should show the title and the projected content', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h3')?.textContent).toBe('Delete this bill?');
    expect(el.querySelector('.projected')?.textContent).toContain('Juan Dela Cruz');
  });

  it('should emit confirmed when the confirm button is clicked', () => {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('.confirm-modal .actions button')) as HTMLButtonElement[];
    buttons[0].click();
    expect(host.confirmed).toBe(true);
    expect(host.cancelled).toBe(false);
  });

  it('should emit cancelled when the cancel button is clicked', () => {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('.confirm-modal .actions button')) as HTMLButtonElement[];
    buttons[1].click();
    expect(host.cancelled).toBe(true);
    expect(host.confirmed).toBe(false);
  });

  it('should style the confirm button as danger by default', () => {
    const confirm = fixture.nativeElement.querySelector('.confirm-modal .actions button') as HTMLButtonElement;
    expect(confirm.classList.contains('danger')).toBe(true);
    expect(confirm.textContent?.trim()).toBe('Delete');
  });
});
