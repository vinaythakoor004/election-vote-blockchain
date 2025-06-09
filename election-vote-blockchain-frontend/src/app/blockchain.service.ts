// src/app/blockchain.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BlockchainService {
  private apiUrl = 'http://localhost:3001'; // Ensure this matches your Node.js server port

  constructor(private http: HttpClient) { }

  // Existing methods (ensure they are present from previous steps)
  getBlockchain(): Observable<any> {
    return this.http.get(`${this.apiUrl}/blockchain`);
  }

  getPendingTransactions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/transactions/pending`);
  }

  mineBlock(minerAddress?: string): Observable<any> {
    // minerAddress is optional for general use, but can be provided for clarity
    return this.http.post(`${this.apiUrl}/mine`, { minerAddress });
  }

  isChainValid(): Observable<any> {
    return this.http.get(`${this.apiUrl}/blockchain/isvalid`);
  }

  getCandidates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/candidates`);
  }

  castVote(voterId: string, candidateId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/vote`, { voterId, candidateId });
  }

  getElectionResults(): Observable<any> {
    return this.http.get(`${this.apiUrl}/election/results`);
  }

  getVotedUsers(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/voted-users`);
  }

  // --- NEW ADMIN METHODS ---

  /**
   * Registers a voter ID with the backend.
   * @param voterId The ID of the voter to register.
   */
  registerVoter(voterId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/register-voter`, { voterId });
  }

  /**
   * Sets the election status (open/closed).
   * @param isOpen True to open the election, false to close.
   */
  setElectionStatus(isOpen: boolean): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/set-election-status`, { isOpen });
  }

  /**
   * Gets the current election open/closed status.
   */
  getElectionStatus(): Observable<{isElectionOpen: boolean}> {
    return this.http.get<{isElectionOpen: boolean}>(`${this.apiUrl}/admin/election-status`);
  }

  /**
   * Gets the list of all registered voter IDs.
   */
  getRegisteredVoters(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/admin/registered-voters`);
  }
}
