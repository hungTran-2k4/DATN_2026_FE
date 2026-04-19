import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, forkJoin, takeUntil } from 'rxjs';
import { catchError, of } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import {
  ApiBaseService,
  BrandDto,
  CategoryDto,
  CreateProductCommand,
  ProductDto,
  UpdateProductCommand,
} from '../../../../shared/api/generated/api-service-base.service';
import { PagedResult } from '../../../../entities/admin/model/admin-response.util';
import { SellerFacade } from '../../../../features/seller/seller.facade';
import { SellerRegistrationService } from '../../../../features/seller-registration/model/seller-registration.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-seller-products',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule,
    ButtonModule, InputTextModule, TextareaModule, SkeletonModule,
    ToastModule, ConfirmDialogModule, PaginatorModule, TooltipModule,
    DialogModule, DropdownModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './seller-products.component.html',
  styleUrl: './seller-products.component.scss',
})
export class SellerProductsComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject = new Subject<string>();
  private readonly formDestroy$ = new Subject<void>(); // unsubscribe slug listener khi initForm lại

  shopId = '';
  result: PagedResult<ProductDto> = { items: [], pageNumber: 1, pageSize: 10, totalPages: 0, totalRecords: 0 };
  isLoading = true;
  searchKeyword = '';
  currentPage = 1;
  pageSize = 10;
  skeletons = Array(6).fill(null);

  // Dialog state
  showDialog = false;
  isEditMode = false;
  editingProductId = '';
  isSaving = false;
  form!: FormGroup;

  // Dropdown data
  categories: CategoryDto[] = [];
  brands: BrandDto[] = [];
  isLoadingMeta = false;

  readonly statusOptions = [
    { label: 'Nháp', value: 'Draft' },
    { label: 'Đang bán', value: 'Active' },
    { label: 'Ẩn', value: 'Inactive' },
  ];

  constructor(
    private readonly fb: FormBuilder,
    private readonly sellerFacade: SellerFacade,
    private readonly sellerService: SellerRegistrationService,
    private readonly api: ApiBaseService,
    private readonly messageService: MessageService,
    private readonly confirmationService: ConfirmationService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {}

  ngOnInit(): void {
    this.initForm();

    if (!isPlatformBrowser(this.platformId)) return;

    this.sellerService.shopInfo$.pipe(takeUntil(this.destroy$)).subscribe((shop) => {
      if (shop?.id) {
        this.shopId = shop.id;
        this.loadProducts();
      }
    });
    this.sellerService.initState();

    this.searchSubject.pipe(
      debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$),
    ).subscribe(() => { this.currentPage = 1; this.loadProducts(); });

    this.loadMeta();
  }

  ngOnDestroy(): void {
    this.formDestroy$.next();
    this.formDestroy$.complete();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(product?: ProductDto): void {
    // Unsubscribe slug listener từ form cũ
    this.formDestroy$.next();

    this.form = this.fb.group({
      name: [product?.name ?? '', [Validators.required, Validators.maxLength(255)]],
      sku: [product?.sku ?? '', [Validators.maxLength(100)]],
      slug: [product?.slug ?? '', [Validators.maxLength(255)]],
      summary: [product?.summary ?? '', [Validators.maxLength(500)]],
      description: [product?.description ?? ''],
      status: [product?.status ?? 'Draft'],
      categoryId: [product?.categoryId ?? null],
      brandId: [product?.brandId ?? null],
    });

    // Auto-generate slug from name (chỉ khi tạo mới hoặc slug chưa bị sửa tay)
    this.form.get('name')?.valueChanges
      .pipe(takeUntil(this.formDestroy$))
      .subscribe((name: string) => {
        if (!this.isEditMode || !this.form.get('slug')?.dirty) {
          this.form.get('slug')?.setValue(this.generateSlug(name), { emitEvent: false });
        }
      });
  }

  private loadMeta(): void {
    this.isLoadingMeta = true;
    forkJoin({
      categories: this.api.categoriesGET(true).pipe(catchError(() => of({ data: [] }))),
      brands: this.api.brandsGET(undefined, 1, 200).pipe(catchError(() => of({ data: [] }))),
    }).subscribe({
      next: ({ categories, brands }) => {
        this.categories = (categories as any).data ?? [];
        this.brands = (brands as any).data ?? [];
        this.isLoadingMeta = false;
      },
      error: () => { this.isLoadingMeta = false; },
    });
  }

  loadProducts(): void {
    if (!this.shopId) return;
    this.isLoading = true;
    this.sellerFacade.getProducts(this.shopId, this.searchKeyword || undefined, this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (r) => { this.result = r; this.isLoading = false; }, error: () => { this.isLoading = false; } });
  }

  onSearch(): void { this.searchSubject.next(this.searchKeyword); }

  onPageChange(e: PaginatorState): void {
    this.currentPage = (e.page ?? 0) + 1;
    this.pageSize = e.rows ?? 10;
    this.loadProducts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Dialog ──

  openCreateDialog(): void {
    this.isEditMode = false;
    this.editingProductId = '';
    this.initForm();
    this.showDialog = true;
    this.cdr.detectChanges();
  }

  openEditDialog(product: ProductDto): void {
    this.isEditMode = true;
    this.editingProductId = product.id ?? '';
    this.initForm(product);
    this.showDialog = true;
    this.cdr.detectChanges();
  }

  closeDialog(): void {
    this.showDialog = false;
    this.isSaving = false;
  }

  saveProduct(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSaving = true;
    const v = this.form.value;

    if (this.isEditMode) {
      const cmd = new UpdateProductCommand({
        id: this.editingProductId,
        name: v.name,
        sku: v.sku || undefined,
        slug: v.slug || undefined,
        summary: v.summary || undefined,
        description: v.description || undefined,
        status: v.status,
        categoryId: v.categoryId || undefined,
        brandId: v.brandId || undefined,
        shopId: this.shopId,
      });
      this.sellerFacade.updateProduct(this.editingProductId, this.shopId, cmd).subscribe({
        next: (ok) => {
          this.isSaving = false;
          if (ok) {
            this.messageService.add({ severity: 'success', summary: 'Đã cập nhật', detail: `Sản phẩm "${v.name}" đã được cập nhật.` });
            this.closeDialog();
            this.loadProducts();
          }
        },
        error: () => { this.isSaving = false; this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể cập nhật sản phẩm.' }); },
      });
    } else {
      const cmd = new CreateProductCommand({
        name: v.name,
        sku: v.sku || undefined,
        slug: v.slug || undefined,
        summary: v.summary || undefined,
        description: v.description || undefined,
        status: v.status,
        categoryId: v.categoryId || undefined,
        brandId: v.brandId || undefined,
        shopId: this.shopId,
      });
      this.sellerFacade.createProduct(cmd).subscribe({
        next: (id) => {
          this.isSaving = false;
          if (id) {
            this.messageService.add({ severity: 'success', summary: 'Đã tạo', detail: `Sản phẩm "${v.name}" đã được tạo thành công.` });
            this.closeDialog();
            this.loadProducts();
          }
        },
        error: () => { this.isSaving = false; this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tạo sản phẩm.' }); },
      });
    }
  }

  confirmDelete(product: ProductDto): void {
    this.confirmationService.confirm({
      message: `Bạn có chắc muốn xóa sản phẩm "<strong>${product.name}</strong>"?`,
      header: 'Xác nhận xóa',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa',
      rejectLabel: 'Hủy',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteProduct(product),
    });
  }

  private deleteProduct(product: ProductDto): void {
    if (!product.id || !this.shopId) return;
    this.sellerFacade.deleteProduct(product.id, this.shopId).subscribe({
      next: (ok) => {
        if (ok) {
          this.messageService.add({ severity: 'success', summary: 'Đã xóa', detail: `Sản phẩm "${product.name}" đã được xóa.` });
          this.loadProducts();
        }
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể xóa sản phẩm.' }),
    });
  }

  // ── Helpers ──

  getMainImage(product: ProductDto): string {
    const main = product.images?.find((i) => i.isMain);
    return main?.imageUrl ?? product.images?.[0]?.imageUrl ?? '';
  }

  getStatusLabel(status?: string): string {
    const map: Record<string, string> = { active: 'Đang bán', draft: 'Nháp', inactive: 'Ẩn' };
    return map[status?.toLowerCase() ?? ''] ?? status ?? '';
  }

  private generateSlug(name: string): string {
    return name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 100);
  }
}
