import { Routes } from '@angular/router';
import { CustomersComponent } from './pages/customers/customers';
import { OrdersComponent } from './pages/orders/orders';

export const routes: Routes = [
  { path: '', redirectTo: 'customers', pathMatch: 'full' },
  { path: 'customers', component: CustomersComponent },
  { path: 'customers/:id/orders', component: OrdersComponent },
];
