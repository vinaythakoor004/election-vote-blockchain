import { Component, OnInit } from '@angular/core';
import { BlockchainService } from '../blockchain.service';
import { interval, Subscription } from 'rxjs'; // For refreshing results
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-election-results',
  templateUrl: './election-results.component.html',
  styleUrls: ['./election-results.component.css'],
  imports: [ CommonModule ]
})
export class ElectionResultsComponent implements OnInit {
  Object = Object;
  results: { [key: string]: { name: string, votes: number } } = {};
  pendingTransactionsCount: number = 0;
  private refreshSubscription: Subscription | undefined;
  minerAddress: string = 'election-authority'; // Example miner address

  constructor(private blockchainService: BlockchainService) { }

  ngOnInit(): void {
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe(); // Stop refreshing on component destroy
    }
  }

  startAutoRefresh(): void {
    this.fetchResults();
    this.fetchPendingTransactions();
    // Refresh results every 5 seconds
    this.refreshSubscription = interval(5000).subscribe(() => {
      this.fetchResults();
      this.fetchPendingTransactions();
    });
  }

  fetchResults(): void {
    this.blockchainService.getElectionResults().subscribe(
      data => {
        this.results = data;
      },
      error => {
        console.error('Error fetching election results:', error);
      }
    );
  }

  fetchPendingTransactions(): void {
    this.blockchainService.getPendingTransactions().subscribe(
      data => {
        this.pendingTransactionsCount = data.length;
      },
      error => {
        console.error('Error fetching pending transactions:', error);
      }
    );
  }

  mineVotes(): void {
    this.blockchainService.mineBlock(this.minerAddress).subscribe(
      response => {
        console.log(response.message);
        this.fetchResults(); // Refresh results after mining
        this.fetchPendingTransactions();
      },
      error => {
        console.error('Error mining votes:', error);
        alert('Failed to mine votes: ' + (error.error.message || error.message)); // Use a custom modal in real app
      }
    );
  }
}