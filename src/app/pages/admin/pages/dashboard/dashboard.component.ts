import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { AdminExportService } from '../../../../core/services/admin-export.service';

interface KpiCard {
  title: string;
  value: string;
  icon: string;
  iconBg: string;
}

@Component({
  selector: 'app-admin-dashboard-page',
  standalone: true,
  imports: [CommonModule, CardModule, ButtonModule, TagModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class AdminDashboardPageComponent {
  lastUpdatedLabel = this.buildTimestampLabel();

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

  readonly quickInsights = [
    {
      title: 'Don can xu ly som',
      value: '24',
      description: '8 don cho xac nhan, 16 don dang van chuyen.',
      severity: 'warn' as const,
    },
    {
      title: 'San pham can toi uu',
      value: '11',
      description: 'San pham ton cao, view thap trong 7 ngay.',
      severity: 'danger' as const,
    },
    {
      title: 'Shop dang on dinh',
      value: '92%',
      description: 'Ty le shop dat SLA phan hoi trong ngay.',
      severity: 'success' as const,
    },
  ];

  constructor(
    private readonly exportService: AdminExportService,
    private readonly messageService: MessageService,
  ) {}

  refreshDashboard(): void {
    this.lastUpdatedLabel = this.buildTimestampLabel();
    this.messageService.add({
      severity: 'success',
      summary: 'Da lam moi',
      detail: 'Bo chi so dashboard da duoc cap nhat.',
    });
  }

  exportDashboardReport(): void {
    const rows = this.kpiCards.map((card) => ({
      metric: card.title,
      value: card.value,
    }));

    this.exportService.exportCsv('admin-dashboard-kpi', rows, [
      { header: 'Chi so', value: (row) => row.metric },
      { header: 'Gia tri', value: (row) => row.value },
    ]);

    this.messageService.add({
      severity: 'info',
      summary: 'Da xuat bao cao',
      detail: `Da xuat ${rows.length} chi so dashboard.`,
    });
  }

  private buildTimestampLabel(): string {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `Cap nhat luc ${hh}:${mm}`;
  }
}
