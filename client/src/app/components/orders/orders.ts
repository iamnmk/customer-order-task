import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { OrdersService } from '../../services/orders';
import { CustomersService } from '../../services/customers';
import { RealtimeService } from '../../services/realtime';
import { ToastService } from '../../services/toast.service';
import { Order } from '../../models/order.model';
import { Customer } from '../../models/customer.model';
import { PagedResult } from '../../models/paged-result.model';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './orders.html',
  styleUrl: './orders.scss',
})
export class OrdersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  customerId!: number;
  customer: Customer | null = null;
  orders: Order[] = [];
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalCount = 0;
  totalPages = 0;
  
  loading = false;
  error: string | null = null;
  isRealtimeConnected = false;
  
  // Auto-update toggle
  autoUpdateEnabled = true;
  
  private readonly AUTO_UPDATE_STORAGE_KEY = 'orders-auto-update-enabled';
  
  // Filters
  showFilters = false;
  filters = {
    fromDate: '',
    toDate: '',
    minAmount: null as number | null,
    maxAmount: null as number | null,
  };
  
  // Make Math available in template
  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private ordersService: OrdersService,
    private customersService: CustomersService,
    private realtimeService: RealtimeService,
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    // Restore auto-update preference from localStorage
    const savedAutoUpdate = localStorage.getItem(this.AUTO_UPDATE_STORAGE_KEY);
    if (savedAutoUpdate !== null) {
      this.autoUpdateEnabled = savedAutoUpdate === 'true';
    }
    
    // Get customer ID from route
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(async (params) => {
      this.customerId = +params['id'];
      
      if (this.customerId) {
        await this.loadCustomer();
        await this.loadOrders();
        await this.setupRealtime();
      }
    });
  }

  ngOnDestroy(): void {
    // Leave the customer group and cleanup
    if (this.customerId) {
      this.realtimeService.leaveCustomerGroup(this.customerId);
    }
    
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadCustomer(): Promise<void> {
    this.customersService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (customers) => {
        this.customer = customers.find((c) => c.id === this.customerId) || null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load customer:', err);
      }
    });
  }

  private async loadOrders(): Promise<void> {
    this.loading = true;
    this.error = null;

    this.ordersService
      .getCustomerOrders(this.customerId, {
        page: this.currentPage,
        pageSize: this.pageSize,
        fromDate: this.filters.fromDate || undefined,
        toDate: this.filters.toDate || undefined,
        minAmount: this.filters.minAmount ?? undefined,
        maxAmount: this.filters.maxAmount ?? undefined,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result: PagedResult<Order>) => {
          this.orders = result.items;
          this.totalCount = result.totalCount;
          this.totalPages = Math.ceil(this.totalCount / this.pageSize);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = 'Failed to load orders.';
          this.loading = false;
          console.error('Error loading orders:', err);
          this.cdr.markForCheck();
        }
      });
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  applyFilters(): void {
    // Reset to page 1 when applying filters
    this.currentPage = 1;
    this.loadOrders();
  }

  clearFilters(): void {
    this.filters = {
      fromDate: '',
      toDate: '',
      minAmount: null,
      maxAmount: null,
    };
    this.currentPage = 1;
    this.loadOrders();
  }

  get hasActiveFilters(): boolean {
    return !!(
      this.filters.fromDate ||
      this.filters.toDate ||
      this.filters.minAmount !== null ||
      this.filters.maxAmount !== null
    );
  }

  private async setupRealtime(): Promise<void> {
    try {
      // Start SignalR connection
      await this.realtimeService.start();
      
      // Join the customer group
      await this.realtimeService.joinCustomerGroup(this.customerId);
      
      // Listen for connection state changes
      this.realtimeService
        .getConnectionState()
        .pipe(takeUntil(this.destroy$))
        .subscribe((state) => {
          this.isRealtimeConnected = this.realtimeService.isConnected();
          this.cdr.markForCheck();
        });
      
      // Listen for order created events
      this.realtimeService
        .getOrderCreatedEvents()
        .pipe(takeUntil(this.destroy$))
        .subscribe((event) => {
          if (event && event.customerId === this.customerId && this.autoUpdateEnabled) {
            console.log('🔔 New order for this customer!', event);
            this.toastService.info(`New order #${event.orderId} received ($${event.amount.toFixed(2)})`);
            // Reload orders when a new one is created
            this.loadOrders();
          }
        });
      
      this.isRealtimeConnected = true;
    } catch (error) {
      console.error('Failed to setup realtime connection:', error);
      this.isRealtimeConnected = false;
    }
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadOrders();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadOrders();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadOrders();
    }
  }

  get paginationPages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  toggleAutoUpdate(): void {
    this.autoUpdateEnabled = !this.autoUpdateEnabled;
    
    // Save preference to localStorage
    localStorage.setItem(this.AUTO_UPDATE_STORAGE_KEY, this.autoUpdateEnabled.toString());
    
    if (this.autoUpdateEnabled) {
      this.toastService.success('Auto-update enabled - Orders will refresh automatically');
    } else {
      this.toastService.warning('Auto-update paused - Manual refresh only');
    }
  }
}
