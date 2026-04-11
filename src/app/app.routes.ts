import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./shared/ui/organisms/user-layout/user-layout.component').then(m => m.UserLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'home'
      },
      {
        path: 'home',
        loadComponent: () => import('./pages/user/pages/home/home.component').then(m => m.HomeComponent)
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        loadComponent: () => import('./pages/user/pages/profile/profile.component').then(m => m.ProfileComponent)
      }
    ]
  },
  {
    path: 'auth',
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'login',
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/auth/pages/login/login.component').then(
            (m) => m.LoginComponent,
          ),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./pages/auth/pages/register/register.component').then(
            (m) => m.RegisterComponent,
          ),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import(
            './pages/auth/pages/forgot-password/forgot-password.component'
          ).then((m) => m.ForgotPasswordComponent),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import(
            './pages/auth/pages/reset-password/reset-password.component'
          ).then((m) => m.ResetPasswordComponent),
      },
    ],
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./shared/ui/organisms/admin-layout/admin-layout.component').then(
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
          import('./pages/admin/pages/dashboard/dashboard.component').then(
            (m) => m.AdminDashboardPageComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/admin/pages/users/users.component').then(
            (m) => m.AdminUsersPageComponent,
          ),
      },
      {
        path: 'shops',
        loadComponent: () =>
          import('./pages/admin/pages/shops/shops.component').then(
            (m) => m.AdminShopsPageComponent,
          ),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/admin/pages/products/products.component').then(
            (m) => m.AdminProductsPageComponent,
          ),
      },
      {
        path: 'catalog',
        loadComponent: () =>
          import('./pages/admin/pages/catalog/catalog.component').then(
            (m) => m.AdminCatalogPageComponent,
          ),
      },
      {
        path: 'brands',
        loadComponent: () =>
          import('./pages/admin/pages/brands/brands.component').then(
            (m) => m.AdminBrandsPageComponent,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
