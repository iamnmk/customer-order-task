import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Customer } from '../models/customer.model';
import { Observable, timeout } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class CustomersService {
  private baseUrl = `${environment.apiBaseUrl}/api/customers`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Customer[]> {
    return this.http.get<Customer[]>(this.baseUrl).pipe(
      timeout(10000) // 10 second timeout
    );
  }

  create(payload: { name: string; email: string; isActive: boolean }): Observable<Customer> {
    return this.http.post<Customer>(this.baseUrl, payload).pipe(
      timeout(10000)
    );
  }

  update(id: number, payload: { name: string; email: string; isActive: boolean }): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, payload).pipe(
      timeout(10000)
    );
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      timeout(10000)
    );
  }
}

