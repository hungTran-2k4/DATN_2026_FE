import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';
import { AuthSessionService } from '../../../../core/services/auth-session.service';
import { ApiBaseService } from '../../../../shared/api/generated/api-service-base.service';
import { CartService } from '../../../../pages/cart/services/cart.service';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-user-header',
  standalone: true,
  imports: [CommonModule, RouterLink, MenuModule, NgOptimizedImage],
  templateUrl: './user-header.component.html',
  styleUrl: './user-header.component.scss',
})
export class UserHeaderComponent implements OnInit {
  userMenuItems: MenuItem[] = [];
  cartCount$: Observable<number> = of(0);

  constructor(
    public readonly authSession: AuthSessionService,
    private readonly api: ApiBaseService,
    private readonly router: Router,
    private readonly cartService: CartService,
  ) {}

  ngOnInit(): void {
    this.cartCount$ = this.cartService.totalItems$;

    // Load cart nếu đã đăng nhập
    if (this.authSession.getSession()) {
      this.cartService.loadCart().subscribe();
    }

    this.authSession.currentUser$.subscribe((user) => {
      this.userMenuItems = [
        {
          label: 'Trang cá nhân',
          icon: 'pi pi-id-card',
          command: () => this.router.navigate(['/profile']),
        },
        {
          label: 'Kênh người bán',
          icon: 'pi pi-shop',
          visible: this.authSession.isSeller(),
          command: () => this.router.navigate(['/seller/dashboard']),
        },
        {
          label: 'Trang quản trị',
          icon: 'pi pi-cog',
          visible: this.authSession.isAdmin(),
          command: () => this.router.navigate(['/admin/dashboard']),
        },
        { separator: true },
        {
          label: 'Đăng xuất',
          icon: 'pi pi-sign-out',
          command: () => this.logout(),
        },
      ];
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
