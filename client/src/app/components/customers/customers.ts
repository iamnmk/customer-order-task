import { Component, OnDestroy, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, forkJoin, interval, of, switchMap, takeUntil, map, catchError, startWith, tap } from 'rxjs';

import { CustomersService } from '../../services/customers';
import { OrdersService } from '../../services/orders';
import { RealtimeService } from '../../services/realtime';
import { ToastService } from '../../services/toast.service';
import { Customer } from '../../models/customer.model';
import { CustomerDashboardItem } from '../../models/customer-dashboard.model';

@Component({
  selector: 'app-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './customers.html',
  styleUrl: './customers.scss',
})
export class CustomersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  customers: CustomerDashboardItem[] = [];

  // simple form model
  form = { name: '', email: '', isActive: true };
  editingCustomerId: number | null = null;

  loading = false;
  error: string | null = null;
  isRealtimeConnected = false;

  constructor(
    private customersService: CustomersService,
    private ordersService: OrdersService,
    private realtimeService: RealtimeService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    // Load dashboard immediately
    this.loadDashboard().subscribe();
    
    // Setup SignalR for real-time updates
    await this.setupRealtime();
  }

  private async setupRealtime(): Promise<void> {
    try {
      // Start SignalR connection
      await this.realtimeService.start();
      this.isRealtimeConnected = true;
      
      // Listen for connection state changes
      this.realtimeService
        .getConnectionState()
        .pipe(takeUntil(this.destroy$))
        .subscribe((state) => {
          this.isRealtimeConnected = this.realtimeService.isConnected();
          console.log('SignalR connection state:', state);
          this.cdr.markForCheck();
        });
      
      // Listen for order created events - reload dashboard when any order is created
      this.realtimeService
        .getOrderCreatedEvents()
        .pipe(takeUntil(this.destroy$))
        .subscribe((event) => {
          if (event) {
            console.log('🔔 Order created event received, refreshing dashboard...', event);
            // Reload the entire dashboard to update counts
            this.loadDashboard().subscribe();
          }
        });
      
      console.log('✅ Real-time updates enabled for customers dashboard');
    } catch (error) {
      console.error('Failed to setup realtime connection:', error);
      this.isRealtimeConnected = false;
      
      // Fallback to polling if SignalR fails
      console.log('⚠️ Falling back to polling every 10 seconds');
      interval(10000)
        .pipe(
          takeUntil(this.destroy$),
          switchMap(() => this.loadDashboard())
        )
        .subscribe();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadDashboard() {
    this.loading = true;
    this.error = null;

    return this.customersService.getAll().pipe(
      switchMap((customers) => {
        console.log('Loaded customers:', customers);
        console.log('Customers length:', customers.length);
        console.log('Customers type:', typeof customers, Array.isArray(customers));
        
        if (customers.length === 0) {
          console.log('No customers found, stopping loading');
          // If no customers, set loading to false and return empty array
          this.loading = false;
          this.cdr.markForCheck();
          return of([] as CustomerDashboardItem[]);
        }

        console.log('About to fetch orders for customers...');
        
        // For each customer, fetch page 1 size 1 to get totalCount + latest
        const calls = customers.map((c) => {
          console.log(`Creating call for customer ${c.id} (${c.name})`);
          return this.ordersService.getCustomerOrders(c.id, { page: 1, pageSize: 1 }).pipe(
            map((paged) => {
              console.log(`✅ Orders received for customer ${c.id}:`, paged);
              return {
                ...c,
                totalOrders: paged.totalCount,
                latestOrderTime: paged.items.length ? paged.items[0].createdAt : null,
              } as CustomerDashboardItem;
            }),
            catchError((err) => {
              console.warn(`❌ Failed to load orders for customer ${c.id}:`, err);
              return of({
                ...c,
                totalOrders: 0,
                latestOrderTime: null,
              } as CustomerDashboardItem);
            })
          );
        });

        console.log(`Created ${calls.length} order calls, starting forkJoin...`);
        
        if (calls.length === 0) {
          console.log('No calls to make, returning empty array');
          this.loading = false;
          return of([] as CustomerDashboardItem[]);
        }
        
        return forkJoin(calls);
      }),
      map((items) => {
        console.log('✅ forkJoin completed! All customer data loaded:', items);
        console.log('Items received:', items.length);
        // sort by createdAt newest first (optional)
        items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
        this.customers = items;
        console.log('Setting loading to false');
        this.loading = false;
        console.log('Loading is now:', this.loading);
        console.log('Triggering change detection...');
        this.cdr.markForCheck();
        return items;
      }),
      catchError((err) => {
        console.error('❌ CATCH ERROR triggered:', err);
        this.loading = false;
        console.error('Error loading customers:', err);
        this.error = `Failed to load customers. Is the backend running at ${err.url || 'the API'}?`;
        this.cdr.markForCheck();
        return of([]);
      })
    );
  }

  async submit(): Promise<void> {
    this.error = null;

    const payload = {
      name: this.form.name.trim(),
      email: this.form.email.trim(),
      isActive: this.form.isActive,
    };

    if (!payload.name || !payload.email) {
      this.error = 'Name and Email are required.';
      return;
    }

    try {
      if (this.editingCustomerId == null) {
        await this.customersService.create(payload).toPromise();
        this.toastService.success('Customer created successfully!');
      } else {
        await this.customersService.update(this.editingCustomerId, payload).toPromise();
        this.toastService.success('Customer updated successfully!');
      }

      this.resetForm();
      // refresh immediately
      this.loadDashboard().subscribe();
    } catch (err) {
      this.error = 'Save failed.';
      this.toastService.error('Failed to save customer. Please try again.');
    }
  }

  edit(c: CustomerDashboardItem): void {
    this.editingCustomerId = c.id;
    this.form = { name: c.name, email: c.email, isActive: c.isActive };
  }

  async remove(id: number): Promise<void> {
    if (!confirm('Delete this customer? All orders will be deleted too.')) return;

    this.error = null;
    try {
      await this.customersService.delete(id).toPromise();
      console.log('Customer deleted, showing success toast');
      this.toastService.success('Customer deleted successfully!');
      this.loadDashboard().subscribe();
    } catch (err) {
      console.error('Delete failed:', err);
      this.error = 'Delete failed.';
      this.toastService.error('Failed to delete customer. Please try again.');
    }
  }

  resetForm(): void {
    this.editingCustomerId = null;
    this.form = { name: '', email: '', isActive: true };
  }
}
