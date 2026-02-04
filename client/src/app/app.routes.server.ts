import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'customers/:id/orders',
    renderMode: RenderMode.Client // Dynamic route with parameters - use client-side rendering
  },
  {
    path: '**',
    renderMode: RenderMode.Server // Use server-side rendering for other routes
  }
];
