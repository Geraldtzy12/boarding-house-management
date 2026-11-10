import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BillForm } from './bill-form';

describe('BillForm', () => {
  let component: BillForm;
  let fixture: ComponentFixture<BillForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillForm],
    }).compileComponents();

    fixture = TestBed.createComponent(BillForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
