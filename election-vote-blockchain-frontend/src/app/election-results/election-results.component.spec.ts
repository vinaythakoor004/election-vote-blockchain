import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ElectionResultsComponent } from './election-results.component';

describe('ElectionResultsComponent', () => {
  let component: ElectionResultsComponent;
  let fixture: ComponentFixture<ElectionResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElectionResultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ElectionResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
