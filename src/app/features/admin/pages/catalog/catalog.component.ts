import { AsyncPipe, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { combineLatest, map, Observable, take } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import {
  BrandDto,
  CategoryDto,
} from '../../../../data-access/api/api-service-base.service';
import { AdminExportService } from '../../../../core/services/admin-export.service';
import { AdminCatalogFacade } from '../../services/admin-catalog.facade';

@Component({
  selector: 'app-admin-catalog-page',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.scss',
})
export class AdminCatalogPageComponent {
  categories$: Observable<CategoryDto[]>;
  brands$: Observable<BrandDto[]>;
  catalogStats$!: Observable<{
    categories: number;
    brands: number;
    activeCategories: number;
  }>;

  constructor(
    private readonly catalogFacade: AdminCatalogFacade,
    private readonly exportService: AdminExportService,
    private readonly messageService: MessageService,
  ) {
    this.categories$ = this.catalogFacade.getCategories();
    this.brands$ = this.catalogFacade.getBrands();
    this.rebindStreams();
  }

  reloadCatalog(): void {
    this.categories$ = this.catalogFacade.getCategories();
    this.brands$ = this.catalogFacade.getBrands();
    this.rebindStreams();

    this.messageService.add({
      severity: 'success',
      summary: 'Da lam moi',
      detail: 'Du lieu danh muc va thuong hieu da duoc cap nhat.',
    });
  }

  exportCategories(categories: CategoryDto[]): void {
    this.exportService.exportCsv('admin-categories', categories, [
      { header: 'Category ID', value: (c) => c.id },
      { header: 'Ten', value: (c) => c.name },
      { header: 'Slug', value: (c) => c.slug },
      { header: 'Active', value: (c) => (c.isActive ? 'Co' : 'Khong') },
    ]);

    this.messageService.add({
      severity: 'info',
      summary: 'Da xuat CSV',
      detail: `Da xuat ${categories.length} dong danh muc.`,
    });
  }

  exportCurrentCategories(): void {
    this.categories$.pipe(take(1)).subscribe((categories) => {
      this.exportCategories(categories);
    });
  }

  exportBrands(brands: BrandDto[]): void {
    this.exportService.exportCsv('admin-brands', brands, [
      { header: 'Brand ID', value: (b) => b.id },
      { header: 'Ten', value: (b) => b.name },
      { header: 'Slug', value: (b) => b.slug },
      { header: 'Active', value: (b) => (b.isActive ? 'Co' : 'Khong') },
    ]);

    this.messageService.add({
      severity: 'info',
      summary: 'Da xuat CSV',
      detail: `Da xuat ${brands.length} dong thuong hieu.`,
    });
  }

  exportCurrentBrands(): void {
    this.brands$.pipe(take(1)).subscribe((brands) => {
      this.exportBrands(brands);
    });
  }

  notifyFeaturePending(feature: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Dang phat trien',
      detail: `${feature} se duoc bo sung o buoc tiep theo.`,
    });
  }

  private rebindStreams(): void {
    this.catalogStats$ = combineLatest([this.categories$, this.brands$]).pipe(
      map(([categories, brands]) => ({
        categories: categories.length,
        brands: brands.length,
        activeCategories: categories.filter((c) => c.isActive).length,
      })),
    );
  }
}
