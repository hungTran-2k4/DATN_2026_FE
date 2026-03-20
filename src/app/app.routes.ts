import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'admin/dashboard',
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./layout/components/admin-layout/admin-layout.component').then(
        (m) => m.AdminLayoutComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/pages/dashboard/dashboard.component').then(
            (m) => m.AdminDashboardPageComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/pages/users/users.component').then(
            (m) => m.AdminUsersPageComponent,
          ),
      },
      {
        path: 'shops',
        loadComponent: () =>
          import('./features/admin/pages/shops/shops.component').then(
            (m) => m.AdminShopsPageComponent,
          ),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/admin/pages/products/products.component').then(
            (m) => m.AdminProductsPageComponent,
          ),
      },
      {
        path: 'catalog',
        loadComponent: () =>
          import('./features/admin/pages/catalog/catalog.component').then(
            (m) => m.AdminCatalogPageComponent,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'admin/dashboard',
  },
];
