import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { CardModule } from 'primeng/card';

interface KpiCard {
  title: string;
  value: string;
  icon: string;
  iconBg: string;
}

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class AdminDashboardPageComponent {
  readonly kpiCards: KpiCard[] = [
    {
      title: 'Save Products',
      value: '178+',
      icon: 'pi pi-heart-fill',
      iconBg: 'var(--kpi-blue)',
    },
    {
      title: 'Stock Products',
      value: '20+',
      icon: 'pi pi-box',
      iconBg: 'var(--kpi-yellow)',
    },
    {
      title: 'Sales Products',
      value: '190+',
      icon: 'pi pi-shopping-bag',
      iconBg: 'var(--kpi-orange)',
    },
    {
      title: 'Job Application',
      value: '12+',
      icon: 'pi pi-briefcase',
      iconBg: 'var(--kpi-violet)',
    },
  ];
}
