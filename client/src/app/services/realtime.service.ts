import { Injectable, inject, signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';

export interface BillChangedMessage {
  billId: number;
  action: string;
  tenantName: string;
  amount: number;
  count: number;
}

// Real-time push (Week 9: SignalR). One shared connection for the whole
// app: the API pushes "billsChanged" whenever a bill is created, edited,
// paid, generated, deleted or restored, and the pages reload their data
// instead of waiting for the user to refresh.
@Injectable({ providedIn: 'root' })
export class RealtimeService {
  private auth = inject(AuthService);
  private connection: HubConnection | null = null;
  private started = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;

  // Pages subscribe to this; the hub pushes whenever a bill changes.
  billsChanged$ = new Subject<BillChangedMessage>();
  connected = signal(false);

  start(): void {
    if (this.started) return;
    this.started = true;
    this.connect();
  }

  stop(): void {
    this.started = false;
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.connected.set(false);
    void this.connection?.stop();
    this.connection = null;
  }

  private connect(): void {
    this.connection = new HubConnectionBuilder()
      .withUrl('http://localhost:5262/hubs/board', {
        accessTokenFactory: () => this.auth.getToken() ?? ''
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    this.connection.on('billsChanged', (msg: BillChangedMessage) => this.billsChanged$.next(msg));
    this.connection.onreconnected(() => this.connected.set(true));
    this.connection.onclose(() => {
      this.connected.set(false);
      this.scheduleRetry();
    });

    this.connection.start()
      .then(() => this.connected.set(true))
      .catch(() => {
        this.connected.set(false);
        // The API may not be up yet (e.g. it started after the client):
        // keep trying until stop() is called.
        this.scheduleRetry();
      });
  }

  private scheduleRetry(): void {
    if (!this.started || this.retryTimer !== null) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, 10000);
  }
}
