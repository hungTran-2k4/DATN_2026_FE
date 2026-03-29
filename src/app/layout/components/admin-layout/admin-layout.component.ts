import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';

interface AdminNavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    ButtonModule,
    ToastModule,
  ],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.scss',
})
export class AdminLayoutComponent {
  readonly lastSyncLabel = new Date().toLocaleString('vi-VN');

  readonly navItems: AdminNavItem[] = [
    { label: 'Dashboard', icon: 'pi pi-chart-line', route: '/admin/dashboard' },
    { label: 'Nguoi dung', icon: 'pi pi-users', route: '/admin/users' },
    { label: 'Shop', icon: 'pi pi-shop', route: '/admin/shops' },
    { label: 'San pham', icon: 'pi pi-box', route: '/admin/products' },
    { label: 'Danh muc', icon: 'pi pi-tags', route: '/admin/catalog' },
  ];
}
