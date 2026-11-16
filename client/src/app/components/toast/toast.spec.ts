import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Toast } from './toast';
import { NotificationService, Toast as ToastMessage } from '../../services/notification.service';

describe('Toast', () => {
  let component: Toast;
  let fixture: ComponentFixture<Toast>;
  let service: NotificationService;

  // Real timers: the app is zoneless, so fakeAsync/tick does not work here.
  const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [Toast] }).compileComponents();
    fixture = TestBed.createComponent(Toast);
    component = fixture.componentInstance;
    service = TestBed.inject(NotificationService);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show a success toast and dismiss it on click', () => {
    service.success('Tenant has been saved.');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.toast.success')?.textContent).toContain('Tenant has been saved.');

    (el.querySelector('.toast button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.toast')).toBeNull();
  });

  it('should auto-dismiss a toast after its duration', async () => {
    fixture.componentRef.setInput('durationMs', 50);
    service.success('Bill marked as paid.');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.toast')).toBeTruthy();

    await wait(120);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.toast')).toBeNull();
  });

  it('should cancel pending auto-dismiss timers when destroyed (ngOnDestroy)', async () => {
    fixture.componentRef.setInput('durationMs', 50);
    service.success('Bill marked as paid.');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.toast')).toBeTruthy();

    fixture.destroy();   // ngOnDestroy clears the pending timer
    await wait(120);

    let current: ToastMessage[] = [];
    service.toasts$.subscribe(t => current = t);
    expect(current.length).toBe(1);
  });
});
