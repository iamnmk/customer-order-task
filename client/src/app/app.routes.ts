import { Routes } from '@angular/router';
import { CustomersComponent } from './components/customers/customers';
import { OrdersComponent } from './components/orders/orders';

export const routes: Routes = [
  { path: '', redirectTo: 'customers', pathMatch: 'full' },
  { path: 'customers', component: CustomersComponent },
  { path: 'customers/:id/orders', component: OrdersComponent },
];
