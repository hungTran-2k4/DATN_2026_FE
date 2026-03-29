import { AsyncPipe, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { map, Observable, take } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ShopDto } from '../../../../shared/api/generated/api-service-base.service';
import { AdminExportService } from '../../../../core/services/admin-export.service';
import { AdminShopsFacade } from '../../services/admin-shops.facade';

@Component({
  selector: 'app-admin-shops-page',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    FormsModule,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './shops.component.html',
  styleUrl: './shops.component.scss',
})
export class AdminShopsPageComponent {
  keyword = '';

  shops$: Observable<ShopDto[]>;
  filteredShops$!: Observable<ShopDto[]>;
  shopStats$!: Observable<{
    total: number;
    active: number;
    inactive: number;
  }>;

  constructor(
    private readonly shopsFacade: AdminShopsFacade,
    private readonly exportService: AdminExportService,
    private readonly messageService: MessageService,
  ) {
    this.shops$ = this.shopsFacade.getShops();
    this.rebindStreams();
  }

  reloadShops(): void {
    this.shops$ = this.shopsFacade.getShops();
    this.rebindStreams();

    this.messageService.add({
      severity: 'success',
      summary: 'Da lam moi',
      detail: 'Du lieu shop da duoc cap nhat.',
    });
  }

  resetFilter(): void {
    this.keyword = '';
    this.filteredShops$ = this.shops$;
  }

  exportShops(shops: ShopDto[]): void {
    this.exportService.exportCsv('admin-shops', shops, [
      { header: 'Shop ID', value: (s) => s.id },
      { header: 'Ten shop', value: (s) => s.name },
      { header: 'Slug', value: (s) => s.slug },
      { header: 'Owner ID', value: (s) => s.ownerId },
      {
        header: 'Trang thai',
        value: (s) => (s.isActive ? 'Dang hoat dong' : 'Tam khoa'),
      },
    ]);

    this.messageService.add({
      severity: 'info',
      summary: 'Da xuat CSV',
      detail: `Da xuat ${shops.length} dong du lieu shop.`,
    });
  }

  exportCurrentShops(): void {
    this.filteredShops$.pipe(take(1)).subscribe((shops) => {
      this.exportShops(shops);
    });
  }

  copyShopId(shopId?: string): void {
    if (!shopId) {
      return;
    }

    navigator.clipboard.writeText(shopId);
    this.messageService.add({
      severity: 'success',
      summary: 'Da sao chep',
      detail: 'Shop ID da duoc sao chep vao clipboard.',
    });
  }

  notifyFeaturePending(feature: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Dang phat trien',
      detail: `${feature} se duoc bo sung o buoc tiep theo.`,
    });
  }

  onKeywordChange(): void {
    this.filteredShops$ = this.shops$.pipe(
      map((shops) => this.applySearch(shops)),
    );
  }

  private rebindStreams(): void {
    this.filteredShops$ = this.shops$.pipe(
      map((shops) => this.applySearch(shops)),
    );
    this.shopStats$ = this.shops$.pipe(
      map((shops) => ({
        total: shops.length,
        active: shops.filter((s) => s.isActive).length,
        inactive: shops.filter((s) => !s.isActive).length,
      })),
    );
  }

  private applySearch(shops: ShopDto[]): ShopDto[] {
    const keyword = this.keyword.trim().toLowerCase();
    if (!keyword) {
      return shops;
    }

    return shops.filter((shop) => {
      return (
        shop.name?.toLowerCase().includes(keyword) ||
        shop.slug?.toLowerCase().includes(keyword) ||
        shop.ownerId?.toLowerCase().includes(keyword)
      );
    });
  }

  getStatusSeverity(isActive?: boolean): 'success' | 'danger' {
    return isActive ? 'success' : 'danger';
  }
}
