import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, forkJoin, takeUntil } from 'rxjs';
import { catchError, of } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { TextareaModule } from 'primeng/textarea';
import { SkeletonModule } from 'primeng/skeleton';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { RouterLink } from '@angular/router';
import {
  ApiBaseService,
  BrandDto,
  CategoryDto,
  CreateProductCommand,
  CreateVariantCommand,
  FileParameter,
  ProductDto,
  ProductImageDto,
  ProductVariantDto,
  UpdateProductCommand,
  UpdateStockCommand,
  UpdateVariantCommand,
} from '../../../../shared/api/generated/api-service-base.service';
import { PagedResult } from '../../../../entities/admin/model/admin-response.util';
import { SellerFacade } from '../../../../features/seller/seller.facade';
import { SellerRegistrationService } from '../../../../features/seller-registration/model/seller-registration.service';

export type DialogStep = 'info' | 'images' | 'variants';

export interface VariantRow {
  id?: string;
  name: string;
  sku: string;
  price: number;
  initialStock: number;
  imageUrl: string;
  attributes: { key: string; value: string }[];
  isNew: boolean;
  isSaving: boolean;
}

@Component({
  selector: 'app-seller-products',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterLink,
    ButtonModule, InputTextModule, InputNumberModule, TextareaModule, SkeletonModule,
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
  private readonly formDestroy$ = new Subject<void>();

  shopId = '';
  result: PagedResult<ProductDto> = { items: [], pageNumber: 1, pageSize: 10, totalPages: 0, totalRecords: 0 };
  isLoading = true;
  searchKeyword = '';
  currentPage = 1;
  pageSize = 10;
  skeletons = Array(6).fill(null);

  // ── Dialog state ──
  showDialog = false;
  isEditMode = false;
  currentStep: DialogStep = 'info';
  activeProductId = ''; // ID sản phẩm đang làm việc (sau khi tạo xong step 1)
  isSaving = false;
  form!: FormGroup;

  // ── Dropdown data ──
  categories: CategoryDto[] = [];
  brands: BrandDto[] = [];
  isLoadingMeta = false;

  readonly statusOptions = [
    { label: 'Nháp', value: 'Draft' },
    { label: 'Đang bán', value: 'Active' },
    { label: 'Ẩn', value: 'Inactive' },
  ];

  // ── Images ──
  productImages: ProductImageDto[] = [];
  isUploadingImage = false;

  // ── Variants ──
  variants: VariantRow[] = [];
  isLoadingVariants = false;
  uploadingVariantIndices: { [index: number]: boolean } = {};

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
      if (shop?.id) { this.shopId = shop.id; this.loadProducts(); }
    });
    this.sellerService.initState();

    this.searchSubject.pipe(
      debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$),
    ).subscribe(() => { this.currentPage = 1; this.loadProducts(); });

    this.loadMeta();
  }

  ngOnDestroy(): void {
    this.formDestroy$.next(); this.formDestroy$.complete();
    this.destroy$.next(); this.destroy$.complete();
  }

  // ── Form ──

  private initForm(product?: ProductDto): void {
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

    this.form.get('name')?.valueChanges.pipe(takeUntil(this.formDestroy$)).subscribe((name: string) => {
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

  // ── Products list ──

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

  // ── Dialog open/close ──

  openCreateDialog(): void {
    this.isEditMode = false;
    this.activeProductId = '';
    this.currentStep = 'info';
    this.productImages = [];
    this.variants = [];
    this.initForm();
    this.showDialog = true;
    this.cdr.detectChanges();
  }

  openEditDialog(product: ProductDto): void {
    this.isEditMode = true;
    this.activeProductId = product.id ?? '';
    this.currentStep = 'info';
    this.productImages = [...(product.images ?? [])];
    this.initForm(product);
    this.showDialog = true;
    this.cdr.detectChanges();
    // Load variants
    this.loadVariantsForProduct(product.id!);
  }

  closeDialog(): void {
    this.showDialog = false;
    this.isSaving = false;
    this.loadProducts();
  }

  goToStep(step: DialogStep): void {
    if (step !== 'info' && !this.activeProductId) return;
    this.currentStep = step;
  }

  // ── Step 1: Save basic info ──

  saveProductInfo(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isSaving = true;
    const v = this.form.value;

    if (this.isEditMode && this.activeProductId) {
      const cmd = new UpdateProductCommand({
        id: this.activeProductId,
        name: v.name, sku: v.sku || undefined, slug: v.slug || undefined,
        summary: v.summary || undefined, description: v.description || undefined,
        status: v.status, categoryId: v.categoryId || undefined,
        brandId: v.brandId || undefined, shopId: this.shopId,
      });
      this.sellerFacade.updateProduct(this.activeProductId, this.shopId, cmd).subscribe({
        next: (ok) => {
          this.isSaving = false;
          if (ok) {
            this.messageService.add({ severity: 'success', summary: 'Đã lưu', detail: 'Thông tin sản phẩm đã được cập nhật.' });
            this.currentStep = 'images';
          }
        },
        error: () => { this.isSaving = false; this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể cập nhật sản phẩm.' }); },
      });
    } else {
      const cmd = new CreateProductCommand({
        name: v.name, sku: v.sku || undefined, slug: v.slug || undefined,
        summary: v.summary || undefined, description: v.description || undefined,
        status: v.status, categoryId: v.categoryId || undefined,
        brandId: v.brandId || undefined, shopId: this.shopId,
      });
      this.sellerFacade.createProduct(cmd).subscribe({
        next: (id) => {
          this.isSaving = false;
          if (id) {
            this.activeProductId = id;
            this.isEditMode = true;
            this.messageService.add({ severity: 'success', summary: 'Đã tạo', detail: `Sản phẩm "${v.name}" đã được tạo. Tiếp tục thêm ảnh và biến thể.` });
            this.currentStep = 'images';
          }
        },
        error: () => { this.isSaving = false; this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tạo sản phẩm.' }); },
      });
    }
  }

  // ── Step 2: Images ──

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length || !this.activeProductId) return;

    const file = input.files[0];
    const isMain = this.productImages.length === 0; // Ảnh đầu tiên là main
    this.isUploadingImage = true;

    const fileParam: FileParameter = { data: file, fileName: file.name };
    this.api.imagesPOST(this.activeProductId, isMain, fileParam).subscribe({
      next: (res) => {
        this.isUploadingImage = false;
        if (res.data) {
          this.productImages.push(res.data);
          this.messageService.add({ severity: 'success', summary: 'Đã tải lên', detail: 'Ảnh sản phẩm đã được thêm.' });
        }
        input.value = '';
      },
      error: () => {
        this.isUploadingImage = false;
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải ảnh lên.' });
        input.value = '';
      },
    });
  }

  uploadVariantImage(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    
    this.uploadingVariantIndices[index] = true;
    const fileParam: FileParameter = { data: file, fileName: file.name };
    
    this.api.upload(fileParam).subscribe({
      next: (res) => {
        this.uploadingVariantIndices[index] = false;
        if (res.data) {
          this.variants[index].imageUrl = res.data;
          this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã tải ảnh biến thể lên.' });
        }
        input.value = '';
      },
      error: () => {
        this.uploadingVariantIndices[index] = false;
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải ảnh biến thể lên.' });
        input.value = '';
      }
    });
  }

  setMainImage(image: ProductImageDto): void {
    if (!this.activeProductId || !image.id || image.isMain) return;
    this.api.main(this.activeProductId, image.id).subscribe({
      next: (res) => {
        if (res.data) {
          this.productImages.forEach((img) => (img.isMain = img.id === image.id));
          this.messageService.add({ severity: 'success', summary: 'Đã đặt ảnh chính', detail: '' });
        }
      },
    });
  }

  deleteImage(image: ProductImageDto): void {
    if (!this.activeProductId || !image.id) return;
    this.api.imagesDELETE(this.activeProductId, image.id).subscribe({
      next: (res) => {
        if (res.data) {
          this.productImages = this.productImages.filter((i) => i.id !== image.id);
          this.messageService.add({ severity: 'success', summary: 'Đã xóa ảnh', detail: '' });
        }
      },
    });
  }

  // ── Step 3: Variants ──

  private loadVariantsForProduct(productId: string): void {
    this.isLoadingVariants = true;
    this.api.productsGET(productId, this.shopId).subscribe({
      next: (res) => {
        this.isLoadingVariants = false;
        if (res.data?.variants) {
          this.variants = res.data.variants.map((v: any) => {
            const attrs = v.variantAttributes ? Object.keys(v.variantAttributes).map(k => ({ key: k, value: v.variantAttributes[k] })) : [{ key: '', value: '' }];
            return {
              id: v.id,
              name: v.name || '',
              sku: v.sku || '',
              price: v.price || 0,
              initialStock: v.stockQty || 0,
              imageUrl: v.imageUrl || '',
              attributes: attrs.length > 0 ? attrs : [{ key: '', value: '' }],
              isNew: false,
              isSaving: false
            };
          });
        }
      },
      error: () => { this.isLoadingVariants = false; },
    });
  }

  addVariantRow(): void {
    this.variants.push({
      name: '', sku: '', price: 0, initialStock: 0, imageUrl: '',
      attributes: [{ key: '', value: '' }],
      isNew: true, isSaving: false,
    });
  }

  addAttribute(variant: VariantRow): void {
    variant.attributes.push({ key: '', value: '' });
  }

  removeAttribute(variant: VariantRow, idx: number): void {
    variant.attributes.splice(idx, 1);
  }

  saveVariant(variant: VariantRow, index: number): void {
    if (!variant.name || !this.activeProductId) return;
    variant.isSaving = true;

    const attrs: { [key: string]: string } = {};
    variant.attributes.filter((a) => a.key && a.value).forEach((a) => (attrs[a.key] = a.value));

    if (variant.isNew) {
      const cmd = new CreateVariantCommand({
        productId: this.activeProductId,
        shopId: this.shopId,
        name: variant.name,
        sku: variant.sku || undefined,
        price: variant.price,
        imageUrl: variant.imageUrl || undefined,
        variantAttributes: Object.keys(attrs).length ? attrs : undefined,
        initialStock: variant.initialStock,
      });
      this.api.variantsPOST(this.activeProductId, cmd).subscribe({
        next: (res) => {
          variant.isSaving = false;
          if (res.data?.id) {
            variant.id = res.data.id;
            variant.isNew = false;
            this.messageService.add({ severity: 'success', summary: 'Đã thêm biến thể', detail: variant.name });
          }
        },
        error: () => { variant.isSaving = false; this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể thêm biến thể.' }); },
      });
    } else if (variant.id) {
      const cmd = new UpdateVariantCommand({
        id: variant.id, shopId: this.shopId, name: variant.name,
        sku: variant.sku || undefined, price: variant.price,
        imageUrl: variant.imageUrl || undefined,
        variantAttributes: Object.keys(attrs).length ? attrs : undefined
      });
      this.api.variantsPUT(this.activeProductId, variant.id!, cmd).subscribe({
        next: () => {
          // Update stock qty
          const stockCmd = new UpdateStockCommand({ variantId: variant.id, physicalQuantity: variant.initialStock || 0 });
          this.api.update(stockCmd).subscribe({
            next: () => {
              variant.isSaving = false;
              this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật thông tin và số lượng biến thể' });
            },
            error: () => {
              variant.isSaving = false;
              this.messageService.add({ severity: 'warn', summary: 'Cảnh báo', detail: 'Đã lưu cấu hình nhưng cập nhật tồn kho thất bại' });
            }
          });
        },
        error: () => {
          variant.isSaving = false;
          this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể cập nhật biến thể' });
        }
      });
    }
  }

  removeVariantRow(variant: VariantRow, index: number): void {
    if (variant.isNew) {
      this.variants.splice(index, 1);
      return;
    }
    if (!variant.id || !this.activeProductId) return;
    this.confirmationService.confirm({
      message: `Xóa biến thể "<strong>${variant.name}</strong>"?`,
      header: 'Xác nhận xóa',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa', rejectLabel: 'Hủy',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.api.variantsDELETE(this.activeProductId, variant.id!, this.shopId).subscribe({
          next: (res) => {
            if (res.data) {
              this.variants.splice(index, 1);
              this.messageService.add({ severity: 'success', summary: 'Đã xóa biến thể', detail: '' });
            }
          },
        });
      },
    });
  }

  // ── Submit for review ──

  submitForReview(product: ProductDto): void {
    if (!product.id || !this.shopId) return;
    this.confirmationService.confirm({
      message: `Gửi sản phẩm "<strong>${product.name}</strong>" để Admin duyệt?`,
      header: 'Xác nhận gửi duyệt',
      icon: 'pi pi-send',
      acceptLabel: 'Gửi duyệt',
      rejectLabel: 'Hủy',
      accept: () => {
        this.api.submitForReview(product.id!, this.shopId).subscribe({
          next: (res) => {
            if (res.data) {
              this.messageService.add({ severity: 'success', summary: 'Đã gửi duyệt', detail: `Sản phẩm "${product.name}" đang chờ Admin xem xét.` });
              this.loadProducts();
            }
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể gửi duyệt.' }),
        });
      },
    });
  }

  // ── Delete product ──

  confirmDelete(product: ProductDto): void {
    this.confirmationService.confirm({
      message: `Bạn có chắc muốn xóa sản phẩm "<strong>${product.name}</strong>"?`,
      header: 'Xác nhận xóa',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Xóa', rejectLabel: 'Hủy',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        if (!product.id) return;
        this.sellerFacade.deleteProduct(product.id, this.shopId).subscribe({
          next: (ok) => {
            if (ok) {
              this.messageService.add({ severity: 'success', summary: 'Đã xóa', detail: `Sản phẩm "${product.name}" đã được xóa.` });
              this.loadProducts();
            }
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể xóa sản phẩm.' }),
        });
      },
    });
  }

  // ── Helpers ──

  getMainImage(product: ProductDto): string {
    const main = product.images?.find((i) => i.isMain);
    return main?.imageUrl ?? product.images?.[0]?.imageUrl ?? '';
  }

  getStatusLabel(status?: string): string {
    const map: Record<string, string> = {
      active: 'Đang bán',
      draft: 'Nháp',
      inactive: 'Ẩn',
      pending: 'Chờ duyệt',
      rejected: 'Bị từ chối',
    };
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

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }
}
