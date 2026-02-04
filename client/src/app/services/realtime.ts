import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OrderCreatedEvent {
  orderId: number;
  customerId: number;
  amount: number;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class RealtimeService {
  private hubConnection: signalR.HubConnection | null = null;
  private connectionState$ = new BehaviorSubject<signalR.HubConnectionState>(
    signalR.HubConnectionState.Disconnected
  );

  // Observable for order created events
  private orderCreated$ = new BehaviorSubject<OrderCreatedEvent | null>(null);

  constructor() {
    this.initializeConnection();
  }

  private initializeConnection(): void {
    const hubUrl = `${environment.apiBaseUrl}/hubs/orders`;
    
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.ServerSentEvents | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Exponential backoff: 0s, 2s, 10s, 30s, then 30s
          if (retryContext.previousRetryCount === 0) return 0;
          if (retryContext.previousRetryCount === 1) return 2000;
          if (retryContext.previousRetryCount === 2) return 10000;
          return 30000;
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Listen for OrderCreated events
    this.hubConnection.on('OrderCreated', (event: OrderCreatedEvent) => {
      console.log('📬 SignalR: Order created event received', event);
      this.orderCreated$.next(event);
    });

    // Connection state listeners
    this.hubConnection.onreconnecting((error) => {
      console.log('🔄 SignalR: Reconnecting...', error);
      this.connectionState$.next(signalR.HubConnectionState.Reconnecting);
    });

    this.hubConnection.onreconnected((connectionId) => {
      console.log('✅ SignalR: Reconnected!', connectionId);
      this.connectionState$.next(signalR.HubConnectionState.Connected);
    });

    this.hubConnection.onclose((error) => {
      console.log('❌ SignalR: Connection closed', error);
      this.connectionState$.next(signalR.HubConnectionState.Disconnected);
    });
  }

  /**
   * Start the SignalR connection
   */
  async start(): Promise<void> {
    if (!this.hubConnection) {
      console.error('Hub connection not initialized');
      return;
    }

    if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      console.log('✅ SignalR: Already connected');
      return;
    }

    try {
      await this.hubConnection.start();
      console.log('✅ SignalR: Connection established');
      this.connectionState$.next(signalR.HubConnectionState.Connected);
    } catch (error) {
      console.error('❌ SignalR: Failed to connect', error);
      this.connectionState$.next(signalR.HubConnectionState.Disconnected);
      throw error;
    }
  }

  /**
   * Stop the SignalR connection
   */
  async stop(): Promise<void> {
    if (!this.hubConnection) return;

    try {
      await this.hubConnection.stop();
      console.log('⏹️ SignalR: Connection stopped');
      this.connectionState$.next(signalR.HubConnectionState.Disconnected);
    } catch (error) {
      console.error('❌ SignalR: Error stopping connection', error);
    }
  }

  /**
   * Join a customer group to receive their order updates
   */
  async joinCustomerGroup(customerId: number): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      console.error('Cannot join group: Not connected');
      return;
    }

    try {
      await this.hubConnection.invoke('JoinCustomerGroup', customerId);
      console.log(`✅ Joined customer group: ${customerId}`);
    } catch (error) {
      console.error(`❌ Failed to join customer group ${customerId}:`, error);
    }
  }

  /**
   * Leave a customer group
   */
  async leaveCustomerGroup(customerId: number): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      return;
    }

    try {
      await this.hubConnection.invoke('LeaveCustomerGroup', customerId);
      console.log(`⏹️ Left customer group: ${customerId}`);
    } catch (error) {
      console.error(`❌ Failed to leave customer group ${customerId}:`, error);
    }
  }

  /**
   * Get connection state as observable
   */
  getConnectionState(): Observable<signalR.HubConnectionState> {
    return this.connectionState$.asObservable();
  }

  /**
   * Get order created events as observable
   */
  getOrderCreatedEvents(): Observable<OrderCreatedEvent | null> {
    return this.orderCreated$.asObservable();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }
}
