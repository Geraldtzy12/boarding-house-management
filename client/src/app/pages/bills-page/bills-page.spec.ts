import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BillsPage } from './bills-page';

describe('BillsPage', () => {
  let component: BillsPage;
  let fixture: ComponentFixture<BillsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillsPage],
    }).compileComponents();

    fixture = TestBed.createComponent(BillsPage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
