import { AsyncPipe, CommonModule } from '@angular/common';
import { Component, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { map, Observable, take } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { TabViewModule } from 'primeng/tabview';
import { InputNumberModule } from 'primeng/inputnumber';
import { DropdownModule } from 'primeng/dropdown';
import { EditorModule } from 'primeng/editor';
import { Textarea } from 'primeng/inputtextarea';
import { TooltipModule } from 'primeng/tooltip';
import {
  ApiBaseService,
  GetProductsQuery,
  ProductDto,
  ReviewProductRequest,
} from '../../../../shared/api/generated/api-service-base.service';
import { AdminExportService } from '../../../../core/services/admin-export.service';
import { AdminProductsFacade } from '../../services/admin-products.facade';
import { AdminCatalogFacade } from '../../services/admin-catalog.facade';
import { AdminShopsFacade } from '../../services/admin-shops.facade';
import { CategoryDto, BrandDto, ShopDto, UpdateProductCommand, UpdateStockCommand, ProductVariantDto, UpdateVariantCommand } from '../../../../shared/api/generated/api-service-base.service';

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
    ToastModule,
    ConfirmDialogModule,
    DialogModule,
    TabViewModule,
    InputNumberModule,
    DropdownModule,
    EditorModule,
    Textarea,
    TooltipModule,
    ReactiveFormsModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
})
export class AdminProductsPageComponent {
  keyword = '';
  isReviewDialogVisible = false;
  selectedProduct: ProductDto | null = null;
  selectedCategoryId: string | null = null;
  currentReviewStep: 'info' | 'images' | 'variants' = 'info';
  isEditMode = false;
  isSaving = false;
  editForm!: FormGroup;

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

  categories: CategoryDto[] = [];
  brands: BrandDto[] = [];
  shops: ShopDto[] = [];

  constructor(
    private readonly fb: FormBuilder,
    private readonly productsFacade: AdminProductsFacade,
    private readonly catalogFacade: AdminCatalogFacade,
    private readonly shopsFacade: AdminShopsFacade,
    private readonly exportService: AdminExportService,
    private readonly messageService: MessageService,
    private readonly confirmationService: ConfirmationService,
    private readonly api: ApiBaseService,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {
    this.initForm();
    this.products$ = this.productsFacade.getProducts(this.defaultQuery);
    this.rebindStreams();
    this.loadMetaData();
  }

  private loadMetaData(): void {
    this.catalogFacade.getCategories().subscribe(res => this.categories = res);
    this.catalogFacade.getBrands().subscribe(res => this.brands = res);
    this.shopsFacade.getShops().subscribe(res => this.shops = res);
  }

  getCategoryName(id?: string): string {
    if (!id) return '-';
    const c = this.categories.find(x => x.id === id);
    return c ? (c.name || id) : id;
  }

  getBrandName(id?: string): string {
    if (!id) return '-';
    const b = this.brands.find(x => x.id === id);
    return b ? (b.name || id) : id;
  }

  getShopName(id?: string): string {
    if (!id) return '-';
    const s = this.shops.find(x => x.id === id);
    return s ? (s.name || id) : id;
  }

  reloadProducts(): void {
    this.products$ = this.productsFacade.getProducts(this.defaultQuery);
    this.rebindStreams();

    this.messageService.add({
      severity: 'success',
      summary: 'Đã làm mới',
      detail: 'Dữ liệu sản phẩm đã được cập nhật.',
    });
  }

  resetFilter(): void {
    this.keyword = '';
    this.selectedCategoryId = null;
    this.onKeywordChange();
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
      summary: 'Đã xuất CSV',
      detail: `Đã xuất ${products.length} dòng dữ liệu sản phẩm.`,
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

  reviewProduct(product: ProductDto, action: 'approve' | 'reject'): void {
    const label = action === 'approve' ? 'Duyệt' : 'Từ chối';
    const req = new ReviewProductRequest({ action });
    this.api.review(product.id!, req).subscribe({
      next: (res) => {
        if (res.data !== false) {
          const detail = action === 'approve' ? 'Sản phẩm đã được duyệt và hiển thị.' : 'Sản phẩm đã bị từ chối.';
          this.messageService.add({ severity: action === 'approve' ? 'success' : 'warn', summary: label, detail });
          this.reloadProducts();
        }
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể thực hiện thao tác.' }),
    });
  }

  confirmReviewFromDialog(action: 'approve' | 'reject'): void {
    if (this.selectedProduct) {
      this.isReviewDialogVisible = false;
      this.reviewProduct(this.selectedProduct, action);
      this.selectedProduct = null;
    }
  }

  hideReviewDialog(): void {
    this.isReviewDialogVisible = false;
    this.selectedProduct = null;
    this.isEditMode = false;
  }

  openReviewDialog(product: ProductDto): void {
    this.selectedProduct = product;
    this.isEditMode = false;
    this.isReviewDialogVisible = true;
    this.currentReviewStep = 'info';
  }

  openEditDialog(product: ProductDto): void {
    this.selectedProduct = product;
    this.isEditMode = true;
    this.isReviewDialogVisible = true;
    this.currentReviewStep = 'info';

    this.editForm.patchValue({
      name: product.name,
      sku: product.sku,
      summary: product.summary,
      description: product.description,
      categoryId: product.categoryId,
      brandId: product.brandId,
      status: product.status,
    });
  }

  saveProductInfo(): void {
    if (this.editForm.invalid || !this.selectedProduct) return;

    this.isSaving = true;
    const val = this.editForm.value;
    const command = new UpdateProductCommand({
      id: this.selectedProduct.id,
      name: val.name,
      sku: val.sku,
      summary: val.summary,
      description: val.description,
      categoryId: val.categoryId,
      brandId: val.brandId,
      status: val.status,
    });

    this.api.productsPUT(this.selectedProduct.id!, this.selectedProduct.shopId ?? undefined, command).subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật thông tin sản phẩm.' });
        this.isSaving = false;
        this.reloadProducts();
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể cập nhật sản phẩm.' });
        this.isSaving = false;
      }
    });
  }

  saveVariant(variant: ProductVariantDto): void {
    this.isSaving = true;
    
    // 1. Update Variant Info
    const updateVariantCmd = new UpdateVariantCommand({
      id: variant.id,
      name: variant.name,
      sku: variant.sku,
      price: variant.price,
      imageUrl: variant.imageUrl
    });

    this.api.variantsPUT(this.selectedProduct?.id ?? '', variant.id!, updateVariantCmd).subscribe({
      next: () => {
        // 2. Update Stock
        const stockCmd = new UpdateStockCommand({
          variantId: variant.id,
          physicalQuantity: variant.stockQty
        });

        this.api.update(stockCmd).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Thành công', detail: `Đã cập nhật biến thể ${variant.name} và tồn kho.` });
            this.isSaving = false;
          },
          error: () => {
            this.messageService.add({ severity: 'warn', summary: 'Cảnh báo', detail: 'Đã cập nhật biến thể nhưng lỗi cập nhật tồn kho.' });
            this.isSaving = false;
          }
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể cập nhật biến thể.' });
        this.isSaving = false;
      }
    });
  }

  private initForm(): void {
    this.editForm = this.fb.group({
      name: ['', [Validators.required]],
      sku: ['', [Validators.required]],
      price: [0, [Validators.required, Validators.min(0)]],
      summary: [''],
      description: [''],
      categoryId: [null],
      brandId: [null],
      status: ['active'],
    });
  }

  notifyFeaturePending(feature: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Đang phát triển',
      detail: `${feature} sẽ được bổ sung tiếp theo.`,
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
    if (value === 'active') return 'success';
    if (value === 'pending') return 'warn';
    if (value === 'draft') return 'info';
    if (value === 'rejected' || value === 'inactive') return 'danger';
    return 'info';
  }

  getStatusLabel(status?: string): string {
    const map: Record<string, string> = {
      active: 'Đang bán',
      draft: 'Nháp',
      inactive: 'Ẩn',
      pending: 'Chờ duyệt',
      rejected: 'Bị từ chối',
    };
    return map[status?.toLowerCase() ?? ''] ?? status ?? 'Unknown';
  }

  private applySearch(products: ProductDto[]): ProductDto[] {
    let result = products;
    const keyword = this.keyword.trim().toLowerCase();

    // Filter by Category
    if (this.selectedCategoryId) {
      result = result.filter(p => p.categoryId === this.selectedCategoryId);
    }

    // Filter by Keyword
    if (keyword) {
      result = result.filter((product) => {
        return (
          product.name?.toLowerCase().includes(keyword) ||
          product.sku?.toLowerCase().includes(keyword) ||
          product.status?.toLowerCase().includes(keyword)
        );
      });
    }

    return result;
  }
}
