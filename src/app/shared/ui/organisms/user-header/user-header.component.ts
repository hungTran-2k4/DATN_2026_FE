import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { SidebarModule } from 'primeng/sidebar';
import { ButtonModule } from 'primeng/button';
import { AuthSessionService } from '../../../../core/services/auth-session.service';
import { ApiBaseService } from '../../../../shared/api/generated/api-service-base.service';
import { CartService } from '../../../../features/cart/model/cart.service';

@Component({
  selector: 'app-user-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MenuModule,
    NgOptimizedImage,
    SidebarModule,
    ButtonModule,
  ],
  templateUrl: './user-header.component.html',
  styleUrl: './user-header.component.scss',
})
export class UserHeaderComponent implements OnInit {
  public readonly cartService = inject(CartService);
  userMenuItems: MenuItem[] = [];
  isMobileMenuOpen = false;

  constructor(
    public readonly authSession: AuthSessionService,
    private readonly api: ApiBaseService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    // Load cart nếu đã đăng nhập
    if (this.authSession.getSession()) {
      this.cartService.loadCart().subscribe();
    }

    this.authSession.currentUser$.subscribe((user) => {
      const roles = (user?.roles || []).map((r) => r.toLowerCase());
      const isSeller = roles.includes('seller');
      const isAdmin = roles.includes('admin');

      const menu: MenuItem[] = [
        {
          label: 'Trang cá nhân',
          icon: 'pi pi-id-card',
          command: () => this.router.navigate(['/profile']),
        },
        {
          label: 'Đơn hàng của tôi',
          icon: 'pi pi-shopping-bag',
          command: () =>
            this.router.navigate(['/profile'], {
              queryParams: { tab: 'purchases' },
            }),
        },
      ];

      if (isSeller) {
        menu.push({
          label: 'Kênh người bán',
          icon: 'pi pi-shop',
          command: () => this.router.navigate(['/seller/dashboard']),
        });
      }

      if (isAdmin) {
        menu.push({
          label: 'Trang quản trị',
          icon: 'pi pi-cog',
          command: () => this.router.navigate(['/admin/dashboard']),
        });
      }

      menu.push({ separator: true });
      menu.push({
        label: 'Đăng xuất',
        icon: 'pi pi-sign-out',
        command: () => this.logout(),
      });

      this.userMenuItems = menu;
    });
  }

  logout(): void {
    this.api.logout().subscribe({
      next: () => {
        this.authSession.clearSession();
        this.router.navigate(['/home']);
      },
      error: () => {
        this.authSession.clearSession();
        this.router.navigate(['/home']);
      },
    });
  }
}
