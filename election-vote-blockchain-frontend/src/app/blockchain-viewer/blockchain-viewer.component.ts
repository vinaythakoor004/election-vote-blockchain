// src/app/blockchain-viewer/blockchain-viewer.component.ts (Example)
import { Component, OnInit } from '@angular/core';
import { BlockchainService } from '../blockchain.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-blockchain-viewer',
  templateUrl: './blockchain-viewer.component.html',
  styleUrls: ['./blockchain-viewer.component.css'],
  imports: [ CommonModule ]
})
export class BlockchainViewerComponent implements OnInit {
  blockchain: any[] = [];
  pendingTransactions: any[] = [];
  minerAddress: string = 'address-miner'; // Example miner address

  constructor(private blockchainService: BlockchainService) { }

  ngOnInit(): void {
    this.fetchBlockchain();
    this.fetchPendingTransactions();
  }

  fetchBlockchain() {
    this.blockchainService.getBlockchain().subscribe(data => {
      this.blockchain = data;
    }, error => console.error('Error fetching blockchain:', error));
  }

  fetchPendingTransactions() {
    this.blockchainService.getPendingTransactions().subscribe(data => {
        this.pendingTransactions = data;
    }, error => console.error('Error fetching pending transactions:', error));
  }

  mineTransactions() {
    this.blockchainService.mineBlock(this.minerAddress).subscribe(response => {
      console.log(response.message);
      this.fetchBlockchain(); // Refresh chain after mining
      this.fetchPendingTransactions(); // Clear pending transactions
    }, error => console.error('Error mining block:', error));
  }
}