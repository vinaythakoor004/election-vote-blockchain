import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { VoteFormComponent } from './vote-form/vote-form.component';
import { ElectionResultsComponent } from './election-results/election-results.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, VoteFormComponent, ElectionResultsComponent, AdminDashboardComponent  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'my-blockchain-frontend';
}
