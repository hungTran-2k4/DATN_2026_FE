import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, forkJoin, takeUntil, combineLatest, startWith, filter, switchMap, tap, map } from 'rxjs';
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
  BulkSaveVariantsCommand,
  CategoryDto,
  CreateProductCommand,
  CreateVariantCommand,
  FileParameter,
  ProductDto,
  ProductImageDto,
  ProductVariantDto,
  RestockCommand,
  UpdateProductCommand,
  UpdateStockCommand,
  UpdateVariantCommand,
  VariantSaveItem,
} from '../../../../shared/api/generated/api-service-base.service';
import { PagedResult } from '../../../../shared/api/admin-response.util';
import { SellerFacade } from '../../../../features/seller/seller.facade';
import { SellerRegistrationService } from '../../../../features/seller-registration/model/seller-registration.service';

export type DialogStep = 'info' | 'images' | 'variants';

export interface VariantRow {
  id?: string;
  name: string;
  sku: string;
  price: number;
  originalPrice?: number;
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
  private readonly pageSubject = new Subject<{ page: number; rows: number }>();
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
  baseAttrs: { key: string, value: string }[] = [];
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
  variantAttributeKeys: string[] = ['Màu sắc']; // Mặc định có 1 nhóm
  isLoadingVariants = false;
  uploadingVariantIndices: { [index: number]: boolean } = {};

  // ── Restock state ──
  showRestockDialog = false;
  selectedProductForRestock: ProductDto | null = null;
  restockVariants: any[] = [];
  isRestocking = false;

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

    // Tối ưu hóa việc gọi API: Kết hợp shopId và các trigger (paging, search)
    combineLatest({
      shop: this.sellerService.shopInfo$.pipe(
        filter(s => !!s?.id),
        distinctUntilChanged((a, b) => a?.id === b?.id)
      ),
      trigger: this.searchSubject.pipe(
        debounceTime(400),
        distinctUntilChanged(),
        startWith(this.searchKeyword)
      ),
      page: this.pageSubject.pipe(
        startWith({ page: this.currentPage, rows: this.pageSize })
      )
    }).pipe(
      takeUntil(this.destroy$),
      tap(() => this.isLoading = true),
      switchMap(({ shop, trigger, page }) => {
        this.shopId = shop!.id!;
        this.searchKeyword = trigger;
        return this.sellerFacade.getProducts(this.shopId, trigger || undefined, page.page, page.rows);
      })
    ).subscribe({
      next: (res) => {
        this.result = res;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.isLoading = false; }
    });

    this.sellerService.initState();
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

  getTotalStock(product: ProductDto): number {
    if (!product.variants?.length) return 0;
    return product.variants.reduce((acc, v) => acc + (v.stockQty ?? 0), 0);
  }

  // ── Products list ──

  loadProducts(): void {
    this.pageSubject.next({ page: this.currentPage, rows: this.pageSize });
  }

  onSearch(): void {
    this.searchSubject.next(this.searchKeyword);
  }

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
    this.baseAttrs = [{ key: '', value: '' }];
    this.initForm();
    this.showDialog = true;
    this.cdr.detectChanges();
  }

  openEditDialog(product: ProductDto): void {
    this.isEditMode = true;
    this.activeProductId = product.id ?? '';
    this.currentStep = 'info';
    this.productImages = [...(product.images ?? [])];
    
    // Parse base attributes
    try {
      if (product.baseAttributes) {
        const parsed = JSON.parse(product.baseAttributes);
        this.baseAttrs = Object.keys(parsed).map(k => ({ key: k, value: parsed[k] }));
      } else {
        this.baseAttrs = [];
      }
    } catch {
      this.baseAttrs = [];
    }
    if (this.baseAttrs.length === 0) {
      this.baseAttrs.push({ key: '', value: '' });
    }

    // Build unique attribute keys for the product
    const keys = new Set<string>();
    product.variants?.forEach(v => {
      if (v.variantAttributes) {
        Object.keys(v.variantAttributes).forEach(k => keys.add(k));
      }
    });
    this.variantAttributeKeys = keys.size > 0 ? Array.from(keys) : ['Màu sắc'];

    this.initForm(product);
    this.showDialog = true;
    this.cdr.detectChanges();
    // Load variants
    this.loadVariantsForProduct(product.id!);
  }

  addBaseAttr(): void {
    this.baseAttrs.push({ key: '', value: '' });
  }

  removeBaseAttr(index: number): void {
    this.baseAttrs.splice(index, 1);
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

    // Convert base attributes to JSON
    const attrsObj: any = {};
    this.baseAttrs.filter(a => a.key && a.value).forEach(a => attrsObj[a.key] = a.value);
    const baseAttrsJson = JSON.stringify(attrsObj);

    if (this.isEditMode && this.activeProductId) {
      const cmd = new UpdateProductCommand({
        id: this.activeProductId,
        name: v.name, sku: v.sku || undefined, slug: v.slug || undefined,
        summary: v.summary || undefined, description: v.description || undefined,
        status: v.status, categoryId: v.categoryId || undefined,
        brandId: v.brandId || undefined, shopId: this.shopId,
        baseAttributes: baseAttrsJson
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
        baseAttributes: baseAttrsJson
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
        if (res.data?.variants && res.data.variants.length > 0) {
          // Extract shared keys from existing variants
          const keys = new Set<string>();
          res.data.variants.forEach((v: any) => {
            if (v.variantAttributes) {
              Object.keys(v.variantAttributes).forEach(k => keys.add(k));
            }
          });
          this.variantAttributeKeys = keys.size > 0 ? Array.from(keys) : ['Màu sắc'];

          this.variants = res.data.variants.map((v: any) => {
            // Ensure every variant has all shared keys
            const attrs = this.variantAttributeKeys.map(k => ({
              key: k,
              value: v.variantAttributes?.[k] ?? ''
            }));
            
            return {
              id: v.id,
              name: v.name || '',
              sku: v.sku || '',
              price: v.price || 0,
              originalPrice: v.originalPrice,
              initialStock: v.stockQty || 0,
              imageUrl: v.imageUrl || '',
              attributes: attrs,
              isNew: false,
              isSaving: false
            };
          });
        } else {
          this.variantAttributeKeys = ['Màu sắc'];
          this.variants = [];
        }
      },
      error: () => { this.isLoadingVariants = false; },
    });
  }

  addVariantKey(): void {
    const newKey = `Thuộc tính ${this.variantAttributeKeys.length + 1}`;
    this.variantAttributeKeys.push(newKey);
    // Add to all variants
    this.variants.forEach(v => {
      v.attributes.push({ key: newKey, value: '' });
    });
  }

  removeVariantKey(index: number): void {
    const key = this.variantAttributeKeys[index];
    this.variantAttributeKeys.splice(index, 1);
    // Remove from all variants
    this.variants.forEach(v => {
      v.attributes = v.attributes.filter(a => a.key !== key);
    });
  }

  onVariantKeyChange(index: number, newKey: string): void {
    const oldKey = this.variantAttributeKeys[index];
    if (oldKey === newKey) return;
    this.variantAttributeKeys[index] = newKey;
    this.variants.forEach(v => {
      const attr = v.attributes.find(a => a.key === oldKey);
      if (attr) attr.key = newKey;
    });
  }

  addVariantRow(): void {
    this.variants.push({
      name: '', sku: '', price: 0, initialStock: 0, imageUrl: '',
      attributes: this.variantAttributeKeys.map(k => ({ key: k, value: '' })),
      isNew: true, isSaving: false,
    });
  }

  addAttribute(variant: VariantRow): void {
    variant.attributes.push({ key: '', value: '' });
  }

  removeAttribute(variant: VariantRow, idx: number): void {
    variant.attributes.splice(idx, 1);
  }

  saveAllVariants(): void {
    if (this.variants.length === 0) {
      this.closeDialog();
      return;
    }

    // Filter variants that have a name (minimum required field)
    const validVariants = this.variants.filter(v => !!v.name);
    if (validVariants.length === 0) {
      this.closeDialog();
      return;
    }

    this.isSaving = true;

    const variantItems = validVariants.map((variant) => {
      const attrs: { [key: string]: string } = {};
      variant.attributes
        .filter((a) => a.key && a.value)
        .forEach((a) => (attrs[a.key] = a.value));

      return new VariantSaveItem({
        id: variant.id || undefined,
        name: variant.name,
        sku: variant.sku || undefined,
        price: variant.price,
        originalPrice: variant.originalPrice || undefined,
        imageUrl: variant.imageUrl || undefined,
        variantAttributes: Object.keys(attrs).length ? attrs : undefined,
        initialStock: variant.initialStock,
      });
    });

    const command = new BulkSaveVariantsCommand({
      productId: this.activeProductId!,
      shopId: this.shopId,
      variants: variantItems,
    });

    this.api.variantsBulkSave(this.activeProductId!, command).subscribe({
      next: () => {
        this.isSaving = false;
        this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã lưu cấu hình biến thể.' });
        this.closeDialog();
      },
      error: () => {
        this.isSaving = false;
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Có lỗi xảy ra khi lưu biến thể. Hãy kiểm tra lại tồn kho và giá trị.' });
      }
    });
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
  
  // ── Restock logic ──

  openRestockDialog(product: ProductDto): void {
    this.selectedProductForRestock = product;
    this.restockVariants = [];
    this.showRestockDialog = true;
    
    this.api.productsGET(product.id!, this.shopId).subscribe({
      next: (res) => {
        if (res.data?.variants) {
          this.restockVariants = res.data.variants.map((v: any) => ({
            id: v.id,
            name: v.name,
            sku: v.sku,
            currentStock: v.stockQty || 0,
            addQuantity: 0,
            note: ''
          }));
        }
      }
    });
  }

  submitRestock(): void {
    const validRestocks = this.restockVariants.filter(v => v.addQuantity > 0);
    if (validRestocks.length === 0) {
      this.messageService.add({ severity: 'warn', summary: 'Cảnh báo', detail: 'Vui lòng nhập số lượng cho ít nhất một biến thể.' });
      return;
    }

    this.isRestocking = true;
    const requests = validRestocks.map(v => 
      this.api.restock(new RestockCommand({
        variantId: v.id,
        quantity: v.addQuantity,
        shopId: this.shopId,
        note: v.note || 'Nhập hàng bổ sung'
      }))
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        this.isRestocking = false;
        const successCount = results.filter(r => r.success).length;
        if (successCount > 0) {
          this.messageService.add({ severity: 'success', summary: 'Thành công', detail: `Đã nhập hàng cho ${successCount} biến thể.` });
          this.showRestockDialog = false;
          this.loadProducts();
        } else {
          this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể nhập hàng. Vui lòng thử lại.' });
        }
      },
      error: () => {
        this.isRestocking = false;
        this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Có lỗi xảy ra trong quá trình nhập hàng.' });
      }
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
