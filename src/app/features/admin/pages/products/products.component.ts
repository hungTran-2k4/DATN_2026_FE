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
import {
  GetProductsQuery,
  ProductDto,
} from '../../../../data-access/api/api-service-base.service';
import { AdminExportService } from '../../../../core/services/admin-export.service';
import { AdminProductsFacade } from '../../services/admin-products.facade';

@Component({
  selector: 'app-admin-products-page',
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
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
})
export class AdminProductsPageComponent {
  keyword = '';

  private readonly defaultQuery = new GetProductsQuery({
    page: 1,
    pageSize: 10,
  });

  products$: Observable<ProductDto[]>;
  filteredProducts$!: Observable<ProductDto[]>;
  productStats$!: Observable<{
    total: number;
    published: number;
    pendingOrDraft: number;
  }>;

  constructor(
    private readonly productsFacade: AdminProductsFacade,
    private readonly exportService: AdminExportService,
    private readonly messageService: MessageService,
  ) {
    this.products$ = this.productsFacade.getProducts(this.defaultQuery);
    this.rebindStreams();
  }

  reloadProducts(): void {
    this.products$ = this.productsFacade.getProducts(this.defaultQuery);
    this.rebindStreams();

    this.messageService.add({
      severity: 'success',
      summary: 'Da lam moi',
      detail: 'Du lieu san pham da duoc cap nhat.',
    });
  }

  resetFilter(): void {
    this.keyword = '';
    this.filteredProducts$ = this.products$;
  }

  exportProducts(products: ProductDto[]): void {
    this.exportService.exportCsv('admin-products', products, [
      { header: 'Product ID', value: (p) => p.id },
      { header: 'Ten san pham', value: (p) => p.name },
      { header: 'SKU', value: (p) => p.sku },
      { header: 'Brand ID', value: (p) => p.brandId },
      { header: 'Category ID', value: (p) => p.categoryId },
      { header: 'Trang thai', value: (p) => p.status },
    ]);

    this.messageService.add({
      severity: 'info',
      summary: 'Da xuat CSV',
      detail: `Da xuat ${products.length} dong du lieu san pham.`,
    });
  }

  exportCurrentProducts(): void {
    this.filteredProducts$.pipe(take(1)).subscribe((products) => {
      this.exportProducts(products);
    });
  }

  copyProductSku(sku?: string): void {
    if (!sku) {
      return;
    }

    navigator.clipboard.writeText(sku);
    this.messageService.add({
      severity: 'success',
      summary: 'Da sao chep',
      detail: 'SKU da duoc sao chep vao clipboard.',
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
    this.filteredProducts$ = this.products$.pipe(
      map((products) => this.applySearch(products)),
    );
  }

  private rebindStreams(): void {
    this.filteredProducts$ = this.products$.pipe(
      map((products) => this.applySearch(products)),
    );
    this.productStats$ = this.products$.pipe(
      map((products) => ({
        total: products.length,
        published: products.filter((p) => {
          const value = p.status?.toLowerCase() ?? '';
          return value.includes('active') || value.includes('published');
        }).length,
        pendingOrDraft: products.filter((p) => {
          const value = p.status?.toLowerCase() ?? '';
          return value.includes('pending') || value.includes('draft');
        }).length,
      })),
    );
  }

  getStatusSeverity(status?: string): 'success' | 'warn' | 'danger' | 'info' {
    const value = status?.toLowerCase();
    if (value?.includes('active') || value?.includes('published')) {
      return 'success';
    }
    if (value?.includes('draft') || value?.includes('pending')) {
      return 'warn';
    }
    if (value?.includes('block') || value?.includes('inactive')) {
      return 'danger';
    }
    return 'info';
  }

  private applySearch(products: ProductDto[]): ProductDto[] {
    const keyword = this.keyword.trim().toLowerCase();
    if (!keyword) {
      return products;
    }

    return products.filter((product) => {
      return (
        product.name?.toLowerCase().includes(keyword) ||
        product.sku?.toLowerCase().includes(keyword) ||
        product.status?.toLowerCase().includes(keyword)
      );
    });
  }
}
