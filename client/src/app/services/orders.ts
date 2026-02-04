import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, timeout } from 'rxjs';
import { PagedResult } from '../models/paged-result.model';
import { Order } from '../models/order.model';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  constructor(private http: HttpClient) {}

  getCustomerOrders(customerId: number, options: {
    page: number;
    pageSize: number;
    fromDate?: string;
    toDate?: string;
    minAmount?: number;
    maxAmount?: number;
  }): Observable<PagedResult<Order>> {
    let params = new HttpParams()
      .set('page', options.page)
      .set('pageSize', options.pageSize);

    if (options.fromDate) params = params.set('fromDate', options.fromDate);
    if (options.toDate) params = params.set('toDate', options.toDate);
    if (options.minAmount != null) params = params.set('minAmount', options.minAmount);
    if (options.maxAmount != null) params = params.set('maxAmount', options.maxAmount);

    return this.http.get<PagedResult<Order>>(
      `${environment.apiBaseUrl}/api/customers/${customerId}/orders`,
      { params }
    ).pipe(
      timeout(10000)
    );
  }
}
