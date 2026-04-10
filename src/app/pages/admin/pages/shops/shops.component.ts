import { AsyncPipe, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { map, Observable } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
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
    DialogModule,
    ConfirmDialogModule,
    TooltipModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './shops.component.html',
  styleUrl: './shops.component.scss',
})
export class AdminShopsPageComponent {
  keyword = '';

  shops: ShopDto[] = [];
  totalRecords = 0;
  isLoading = false;

  rows = 10;
  first = 0;

  reportTemplate = 'Hiển thị {first} - {last} / {totalRecords} bản ghi';
  confirmBreakpoints = { '960px': '75vw', '640px': '100vw' };
  dialogBreakpoints = { '960px': '90vw' };
  tableStyle = { 'min-width': '60rem' };
  confirmStyle = { width: '450px' };
  dialogStyle = { width: '700px' };

  shopStats$!: Observable<{
    total: number;
    active: number;
    pending: number;
  }>;

  rowShop: ShopDto | null = null;
  detailDialogVisible = false;
  selectedShop: ShopDto | null = null;

  constructor(
    private readonly shopsFacade: AdminShopsFacade,
    private readonly exportService: AdminExportService,
    private readonly messageService: MessageService,
    private readonly confirmationService: ConfirmationService,
  ) {
    this.rebindStats();
    this.loadShops();
  }

  loadShops(event?: TableLazyLoadEvent): void {
    this.isLoading = true;
    this.rows = event?.rows ?? this.rows;
    this.first = event?.first ?? this.first;
    const page = Math.floor(this.first / this.rows) + 1;

    this.shopsFacade
      .getShopsPaging(this.keyword, null, page, this.rows)
      .subscribe({
        next: (res) => {
          if (res) {
            this.shops = res.data ?? [];
            this.totalRecords = res.totalRecords ?? 0;
          } else {
            this.shops = [];
            this.totalRecords = 0;
          }
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: 'Không thể tải danh sách Shop.',
          });
        },
      });
  }

  reloadShops(): void {
    this.loadShops();
    this.rebindStats();
    this.messageService.add({
      severity: 'success',
      summary: 'Làm mới',
      detail: 'Dữ liệu Shop đã được cập nhật.',
    });
  }

  private rebindStats(): void {
    this.shopStats$ = this.shopsFacade.getShopsPaging('', null, 1, 1000).pipe(
      map((res) => {
        const data = res?.data ?? [];
        return {
          total: res?.totalRecords ?? data.length,
          active: data.filter((s: ShopDto) => s.approvalStatus === 2).length,
          pending: data.filter((s: ShopDto) => s.approvalStatus === 1).length,
        };
      }),
    );
  }

  resetFilter(): void {
    this.keyword = '';
    this.first = 0;
    this.loadShops();
  }

  onKeywordChange(): void {
    this.first = 0;
    this.loadShops();
  }

  exportCurrentShops(): void {
    this.shopsFacade
      .getShopsPaging(this.keyword, null, 1, 1000)
      .subscribe((res) => {
        if (res && res.data) {
          this.exportService.exportCsv('admin-shops', res.data, [
            { header: 'ID', value: (s: ShopDto) => s.id },
            { header: 'Tên Shop', value: (s: ShopDto) => s.name },
            {
              header: 'Chủ sở hữu',
              value: (s: ShopDto) => (s as any).ownerName,
            },
            { header: 'Email', value: (s: ShopDto) => (s as any).ownerEmail },
            {
              header: 'Trạng thái',
              value: (s: ShopDto) => this.getStatusLabel(s.approvalStatus),
            },
          ]);
          this.messageService.add({
            severity: 'info',
            summary: 'Đã xuất CSV',
            detail: `Đã xuất ${res.data.length} dòng dữ liệu shop.`,
          });
        }
      });
  }

  // --- DIALOG ---
  openDetailDialog(shop: ShopDto): void {
    this.selectedShop = shop;
    this.detailDialogVisible = true;
  }

  // --- ACTIONS ---

  approveShop(shop: ShopDto): void {
    this.rowShop = shop;
    this.confirmationService.confirm({
      message: `Bạn có chắc chắn muốn DUYỆT shop ${this.rowShop.name}?`,
      header: 'Xác nhận Duyệt Shop',
      icon: 'pi pi-check-circle',
      acceptLabel: 'Đồng ý',
      rejectLabel: 'Hủy',
      accept: () => {
        this.shopsFacade.changeStatus(this.rowShop!.id!, 2).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Thành công',
              detail: 'Đã duyệt Shop.',
            });
            this.loadShops();
          },
          error: () =>
            this.messageService.add({
              severity: 'error',
              summary: 'Lỗi',
              detail: 'Lỗi khi duyệt Shop.',
            }),
        });
      },
    });
  }

  rejectShop(shop: ShopDto): void {
    this.rowShop = shop;
    this.confirmationService.confirm({
      message: `TỪ CHỐI shop ${this.rowShop.name}. Bạn có chắc chắn?`,
      header: 'Xác nhận Từ chối',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Đồng ý',
      rejectLabel: 'Hủy',
      accept: () => {
        this.shopsFacade.changeStatus(this.rowShop!.id!, 3).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Thành công',
              detail: 'Đã từ chối Shop.',
            });
            this.loadShops();
          },
          error: () =>
            this.messageService.add({
              severity: 'error',
              summary: 'Lỗi',
              detail: 'Lỗi khi từ chối.',
            }),
        });
      },
    });
  }

  suspendShop(shop: ShopDto): void {
    this.rowShop = shop;
    this.confirmationService.confirm({
      message: `ĐÌNH CHỈ shop ${this.rowShop.name}? Shop sẽ không thể hoạt động.`,
      header: 'Đình chỉ Shop',
      icon: 'pi pi-ban',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Đồng ý',
      rejectLabel: 'Hủy',
      accept: () => {
        this.shopsFacade.changeStatus(this.rowShop!.id!, 4).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Thành công',
              detail: 'Đã đình chỉ Shop.',
            });
            this.loadShops();
          },
          error: () =>
            this.messageService.add({
              severity: 'error',
              summary: 'Lỗi',
              detail: 'Lỗi khi thao tác.',
            }),
        });
      },
    });
  }

  deleteShop(shop: ShopDto): void {
    this.rowShop = shop;
    this.confirmationService.confirm({
      message: `XÓA VĨNH VIỄN shop ${this.rowShop.name}? Hành động này không thể hoàn tác và chỉ dùng để xử lý vi phạm nặng.`,
      header: 'Xử lý vi phạm: Xóa Shop',
      icon: 'pi pi-trash',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Xác nhận Xóa',
      rejectLabel: 'Hủy',
      accept: () => {
        this.shopsFacade.deleteShop(this.rowShop!.id!).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Thành công',
              detail: 'Đã xóa Shop khỏi hệ thống.',
            });
            this.loadShops();
          },
          error: () =>
            this.messageService.add({
              severity: 'error',
              summary: 'Lỗi',
              detail: 'Không thể xóa Shop. Vui lòng thử lại sau.',
            }),
        });
      },
    });
  }

  // --- FORMATTERS ---

  getStatusSeverity(status?: number): 'success' | 'warn' | 'danger' | 'info' {
    switch (status) {
      case 2: // Approved
        return 'success';
      case 3: // Rejected
      case 4: // Suspended
        return 'danger';
      case 1: // Pending
      default:
        return 'warn';
    }
  }

  getStatusLabel(status?: number): string {
    switch (status) {
      case 2:
        return 'Hoạt động';
      case 1:
        return 'Chờ duyệt';
      case 3:
        return 'Từ chối';
      case 4:
        return 'Đình chỉ';
      default:
        return 'Không rõ';
    }
  }
}
