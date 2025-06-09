import { Component, OnInit } from '@angular/core';
import { BlockchainService } from '../blockchain.service';
import { interval, Subscription } from 'rxjs'; // For auto-refresh
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  imports: [ CommonModule, FormsModule ]
})
export class AdminDashboardComponent implements OnInit {
  newVoterId: string = '';
  registerVoterMessage: string = '';
  electionStatusMessage: string = '';
  currentElectionStatus: boolean = false;
  registeredVoters: string[] = [];
  votedUsers: string[] = []; // For visibility

  private refreshSubscription: Subscription | undefined;

  constructor(private blockchainService: BlockchainService) { }

  ngOnInit(): void {
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  startAutoRefresh(): void {
    this.fetchElectionStatus();
    this.fetchRegisteredVoters();
    this.fetchVotedUsers();
    this.refreshSubscription = interval(5000).subscribe(() => {
      this.fetchElectionStatus();
      this.fetchRegisteredVoters();
      this.fetchVotedUsers();
    });
  }

  registerVoter(): void {
    if (!this.newVoterId) {
      this.registerVoterMessage = 'Voter ID cannot be empty.';
      return;
    }
    this.blockchainService.registerVoter(this.newVoterId).subscribe(
      response => {
        this.registerVoterMessage = response.message;
        this.newVoterId = ''; // Clear input
        this.fetchRegisteredVoters(); // Refresh list
      },
      error => {
        this.registerVoterMessage = 'Error registering voter: ' + (error.error.message || error.message);
      }
    );
  }

  toggleElectionStatus(): void {
    const newStatus = !this.currentElectionStatus;
    this.blockchainService.setElectionStatus(newStatus).subscribe(
      response => {
        this.electionStatusMessage = response.message;
        this.fetchElectionStatus(); // Refresh status
      },
      error => {
        this.electionStatusMessage = 'Error setting election status: ' + (error.error.message || error.message);
      }
    );
  }

  fetchElectionStatus(): void {
    this.blockchainService.getElectionStatus().subscribe(
      data => {
        this.currentElectionStatus = data.isElectionOpen;
      },
      error => console.error('Error fetching election status:', error)
    );
  }

  fetchRegisteredVoters(): void {
    this.blockchainService.getRegisteredVoters().subscribe(
      data => {
        this.registeredVoters = data;
      },
      error => console.error('Error fetching registered voters:', error)
    );
  }

  fetchVotedUsers(): void {
    this.blockchainService.getVotedUsers().subscribe(
      data => {
        this.votedUsers = data;
      },
      error => console.error('Error fetching voted users:', error)
    );
  }
}
