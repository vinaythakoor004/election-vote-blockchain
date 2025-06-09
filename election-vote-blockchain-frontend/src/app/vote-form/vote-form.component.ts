// src/app/vote-form/vote-form.component.ts
import { Component, OnInit } from '@angular/core';
import { BlockchainService } from '../blockchain.service';
import { interval, Subscription } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vote-form',
  templateUrl: './vote-form.component.html',
  styleUrls: ['./vote-form.component.css'],
  imports: [ FormsModule, CommonModule ]
})
export class VoteFormComponent implements OnInit {
  voterId: string = '';
  selectedCandidateId: string = '';
  candidates: any[] = [];
  message: string = '';
  isSuccess: boolean = false;
  currentElectionStatus: boolean = false; // NEW
  isVoterRegistered: boolean = false;    // NEW
  hasVotedAlready: boolean = false;      // NEW
  private refreshSubscription: Subscription | undefined; // NEW

  constructor(private blockchainService: BlockchainService) { }

  ngOnInit(): void {
    this.startAutoRefresh(); // Start refreshing status and data
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  startAutoRefresh(): void {
    this.fetchCandidates();
    this.fetchElectionStatus();
    this.checkVoterStatus(); // Check voter status initially

    this.refreshSubscription = interval(3000).subscribe(() => { // Refresh every 3 seconds
      this.fetchCandidates();
      this.fetchElectionStatus();
      this.checkVoterStatus(); // Keep checking voter status
    });
  }

  fetchCandidates(): void {
    this.blockchainService.getCandidates().subscribe(
      data => {
        this.candidates = data;
      },
      error => {
        this.message = 'Error loading candidates: ' + error.message;
        this.isSuccess = false;
        console.error(error);
      }
    );
  }

  fetchElectionStatus(): void { // NEW
    this.blockchainService.getElectionStatus().subscribe(
      data => {
        this.currentElectionStatus = data.isElectionOpen;
      },
      error => console.error('Error fetching election status:', error)
    );
  }

  // NEW: Check if voter is registered and if they have voted
  checkVoterStatus(): void {
    if (!this.voterId) {
        this.isVoterRegistered = false;
        this.hasVotedAlready = false;
        return;
    }
    this.blockchainService.getRegisteredVoters().subscribe(
      registeredVoters => {
        this.isVoterRegistered = registeredVoters.includes(this.voterId);
        // Only check voted users if registered (optimization)
        if (this.isVoterRegistered) {
            this.blockchainService.getVotedUsers().subscribe(
                votedUsers => {
                    this.hasVotedAlready = votedUsers.includes(this.voterId);
                },
                error => console.error('Error fetching voted users for status check:', error)
            );
        } else {
            this.hasVotedAlready = false; // Not registered, so haven't voted (by this system)
        }
      },
      error => console.error('Error fetching registered voters for status check:', error)
    );
  }

  submitVote(): void {
    if (!this.voterId || !this.selectedCandidateId) {
      this.message = 'Please enter your Voter ID and select a candidate.';
      this.isSuccess = false;
      return;
    }
    if (!this.currentElectionStatus) { // NEW
      this.message = 'Election is currently closed. You cannot cast a vote.';
      this.isSuccess = false;
      return;
    }
    if (!this.isVoterRegistered) { // NEW
      this.message = `Voter ID '${this.voterId}' is not registered or not eligible to vote.`;
      this.isSuccess = false;
      return;
    }
    if (this.hasVotedAlready) { // NEW
      this.message = `Voter ID '${this.voterId}' has already cast a vote.`;
      this.isSuccess = false;
      return;
    }

    this.blockchainService.castVote(this.voterId, this.selectedCandidateId).subscribe(
      response => {
        this.message = response.message;
        this.isSuccess = true;
        // No longer clear voterId, as user might enter it again to check status
        this.selectedCandidateId = '';
        this.checkVoterStatus(); // Re-check status immediately after casting vote
      },
      error => {
        this.message = 'Error casting vote: ' + (error.error.message || error.message);
        this.isSuccess = false;
        console.error(error);
      }
    );
  }
}