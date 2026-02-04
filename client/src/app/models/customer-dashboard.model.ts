import { Customer } from './customer.model';

export interface CustomerDashboardItem extends Customer {
  totalOrders: number;
  latestOrderTime: string | null;
}
