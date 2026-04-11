import { AsyncPipe, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Observable, take } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import {
  BrandDto,
} from '../../../../shared/api/generated/api-service-base.service';
import { AdminExportService } from '../../../../core/services/admin-export.service';
import { AdminCatalogFacade } from '../../services/admin-catalog.facade';

@Component({
  selector: 'app-admin-brands-page',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
    TooltipModule
  ],
  templateUrl: './brands.component.html'
})
export class AdminBrandsPageComponent {
  brands$: Observable<BrandDto[]>;

  constructor(
    private readonly catalogFacade: AdminCatalogFacade,
    private readonly exportService: AdminExportService,
    private readonly messageService: MessageService
  ) {
    this.brands$ = this.catalogFacade.getBrands();
  }

  reloadBrands(): void {
    this.brands$ = this.catalogFacade.getBrands();
    this.messageService.add({
      severity: 'success',
      summary: 'Thành công',
      detail: 'Dữ liệu thương hiệu đã được cập nhật.',
    });
  }

  exportBrands(brands: BrandDto[]): void {
    this.exportService.exportCsv('admin-brands', brands, [
      { header: 'Brand ID', value: (b) => b.id },
      { header: 'Tên', value: (b) => b.name },
      { header: 'Slug', value: (b) => b.slug },
      { header: 'Hoạt động', value: (b) => (b.isActive ? 'Có' : 'Không') },
    ]);

    this.messageService.add({
      severity: 'info',
      summary: 'Đã xuất CSV',
      detail: `Đã xuất ${brands.length} dòng thương hiệu.`,
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
      summary: 'Đang phát triển',
      detail: `${feature} sẽ được bổ sung ở bước tiếp theo.`,
    });
  }
}
