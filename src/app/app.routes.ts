import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { sellerGuard } from './core/guards/seller.guard';

export const routes: Routes = [
  // ── User Layout (public + auth-protected pages) ──
  {
    path: '',
    loadComponent: () => import('./shared/ui/organisms/user-layout/user-layout.component').then(m => m.UserLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'home' },
      {
        path: 'home',
        loadComponent: () => import('./pages/user/pages/home/home.component').then(m => m.HomeComponent),
      },
      {
        path: 'profile',
        canActivate: [authGuard],
        data: { prerender: false },
        loadComponent: () => import('./pages/user/pages/profile/profile.component').then(m => m.ProfileComponent),
      },
      {
        path: 'product/:id',
        data: { prerender: false },
        loadComponent: () => import('./pages/product/pages/product-detail/product-detail.component').then(m => m.ProductDetailComponent),
      },
      {
        path: 'products',
        loadComponent: () => import('./pages/product/pages/product-listing/product-listing.component').then(m => m.ProductListingComponent),
      },
      {
        path: 'cart',
        data: { prerender: false },
        loadComponent: () => import('./pages/cart/pages/cart/cart.component').then(m => m.CartComponent),
      },
      {
        path: 'checkout',
        data: { prerender: false },
        loadComponent: () => import('./pages/order/pages/checkout/checkout.component').then(m => m.CheckoutComponent),
      },
      // ── Seller Onboarding — dùng UserLayout (header user, không sidebar seller) ──
      {
        path: 'seller/onboarding',
        canActivate: [authGuard],
        data: { prerender: false },
        loadComponent: () => import('./pages/seller/pages/onboarding/seller-onboarding.component').then(m => m.SellerOnboardingComponent),
      },
    ],
  },

  // ── Auth pages ──
  {
    path: 'auth',
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        loadComponent: () => import('./pages/auth/pages/login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () => import('./pages/auth/pages/register/register.component').then(m => m.RegisterComponent),
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./pages/auth/pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./pages/auth/pages/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
      },
    ],
  },

  // ── Seller Center — SellerLayout riêng (sidebar emerald) ──
  {
    path: 'seller',
    canActivate: [sellerGuard],
    data: { prerender: false },
    loadComponent: () => import('./shared/ui/organisms/seller-layout/seller-layout.component').then(m => m.SellerLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        data: { prerender: false },
        loadComponent: () => import('./pages/seller/pages/dashboard/seller-dashboard.component').then(m => m.SellerDashboardComponent),
      },
      {
        path: 'products',
        data: { prerender: false },
        loadComponent: () => import('./pages/seller/pages/products/seller-products.component').then(m => m.SellerProductsComponent),
      },
      {
        path: 'products/create',
        data: { prerender: false },
        loadComponent: () => import('./pages/seller/pages/products/seller-products.component').then(m => m.SellerProductsComponent),
      },
      {
        path: 'products/:id/edit',
        data: { prerender: false },
        loadComponent: () => import('./pages/seller/pages/products/seller-products.component').then(m => m.SellerProductsComponent),
      },
      {
        path: 'orders',
        data: { prerender: false },
        loadComponent: () => import('./pages/seller/pages/orders/seller-orders.component').then(m => m.SellerOrdersComponent),
      },
      {
        path: 'orders/:id',
        data: { prerender: false },
        loadComponent: () => import('./pages/seller/pages/orders/seller-orders.component').then(m => m.SellerOrdersComponent),
      },
      {
        path: 'reviews',
        data: { prerender: false },
        loadComponent: () => import('./pages/seller/pages/reviews/seller-reviews.component').then(m => m.SellerReviewsComponent),
      },
      {
        path: 'finance',
        data: { prerender: false },
        loadComponent: () => import('./pages/seller/pages/finance/seller-finance.component').then(m => m.SellerFinanceComponent),
      },
      {
        path: 'settings',
        data: { prerender: false },
        loadComponent: () => import('./pages/seller/pages/settings/seller-settings.component').then(m => m.SellerSettingsComponent),
      },
    ],
  },

  // ── Admin Center ──
  {
    path: 'admin',
    canActivate: [adminGuard],
    data: { prerender: false },
    loadComponent: () => import('./shared/ui/organisms/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/admin/pages/dashboard/dashboard.component').then(m => m.AdminDashboardPageComponent),
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/admin/pages/users/users.component').then(m => m.AdminUsersPageComponent),
      },
      {
        path: 'shops',
        loadComponent: () => import('./pages/admin/pages/shops/shops.component').then(m => m.AdminShopsPageComponent),
      },
      {
        path: 'products',
        loadComponent: () => import('./pages/admin/pages/products/products.component').then(m => m.AdminProductsPageComponent),
      },
      {
        path: 'catalog',
        loadComponent: () => import('./pages/admin/pages/catalog/catalog.component').then(m => m.AdminCatalogPageComponent),
      },
      {
        path: 'brands',
        loadComponent: () => import('./pages/admin/pages/brands/brands.component').then(m => m.AdminBrandsPageComponent),
      },
    ],
  },

  // ── Fallback ──
  { path: '**', redirectTo: 'home' },
];
