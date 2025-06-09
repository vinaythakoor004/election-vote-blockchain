import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BalanceCheckerComponent } from './balance-checker.component';

describe('BalanceCheckerComponent', () => {
  let component: BalanceCheckerComponent;
  let fixture: ComponentFixture<BalanceCheckerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BalanceCheckerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BalanceCheckerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
