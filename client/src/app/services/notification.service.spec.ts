import { TestBed } from '@angular/core/testing';
import { NotificationService, Toast } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should publish a success toast and remove it on dismiss', () => {
    const seen: Toast[][] = [];
    service.toasts$.subscribe(toasts => seen.push(toasts));

    service.success('Room has been saved.');
    expect(seen[1].length).toBe(1);
    expect(seen[1][0].message).toBe('Room has been saved.');
    expect(seen[1][0].kind).toBe('success');

    service.dismiss(seen[1][0].id);
    expect(seen[2]).toEqual([]);
  });

  it('should publish an error toast', () => {
    const seen: Toast[][] = [];
    service.toasts$.subscribe(toasts => seen.push(toasts));

    service.error('Something went wrong.');
    expect(seen[1].length).toBe(1);
    expect(seen[1][0].message).toBe('Something went wrong.');
    expect(seen[1][0].kind).toBe('error');
  });
});
