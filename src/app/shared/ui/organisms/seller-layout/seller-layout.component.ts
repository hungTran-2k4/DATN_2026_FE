import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { AuthSessionService } from '../../../../core/services/auth-session.service';
import { ApiBaseService } from '../../../api/generated/api-service-base.service';

interface SellerNavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-seller-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MenuModule,
    TooltipModule,
    ToastModule,
    NgOptimizedImage,
  ],
  templateUrl: './seller-layout.component.html',
  styleUrl: './seller-layout.component.scss',
})
export class SellerLayoutComponent implements OnInit {
  sidebarCollapsed = false;

  readonly navItems: SellerNavItem[] = [
    { label: 'Tổng quan', icon: 'pi pi-chart-line', route: '/seller/dashboard' },
    { label: 'Sản phẩm', icon: 'pi pi-box', route: '/seller/products' },
    { label: 'Đơn hàng', icon: 'pi pi-list-check', route: '/seller/orders' },
    { label: 'Kho hàng', icon: 'pi pi-warehouse', route: '/seller/inventory' },
    { label: 'Khuyến mãi', icon: 'pi pi-ticket', route: '/seller/promotions' },
    { label: 'Tài chính', icon: 'pi pi-wallet', route: '/seller/finance' },
    { label: 'Đánh giá', icon: 'pi pi-star', route: '/seller/reviews' },
  ];

  readonly bottomItems: SellerNavItem[] = [
    { label: 'Cài đặt shop', icon: 'pi pi-cog', route: '/seller/settings' },
  ];

  sellerName = '';
  sellerEmail = '';
  shopName = '';

  userMenuItems: MenuItem[] = [];

  constructor(
    public readonly authSession: AuthSessionService,
    private readonly api: ApiBaseService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    const session = this.authSession.getSession();
    this.sellerName = session?.userName ?? 'Người bán';
    this.sellerEmail = session?.userEmail ?? '';

    this.userMenuItems = [
      {
        label: 'Trang mua sắm',
        icon: 'pi pi-home',
        command: () => this.router.navigate(['/home']),
      },
      {
        label: 'Hồ sơ cá nhân',
        icon: 'pi pi-user',
        command: () => this.router.navigate(['/profile']),
      },
      { separator: true },
      {
        label: 'Đăng xuất',
        icon: 'pi pi-sign-out',
        command: () => this.logout(),
      },
    ];
  }

  get sellerInitials(): string {
    return (this.sellerName || 'S').trim().charAt(0).toUpperCase();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout(): void {
    this.api.logout().subscribe({
      next: () => { this.authSession.clearSession(); this.router.navigate(['/home']); },
      error: () => { this.authSession.clearSession(); this.router.navigate(['/home']); },
    });
  }
}
