import { AsyncPipe, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { BehaviorSubject, combineLatest, map, Observable, shareReplay, startWith, switchMap, take } from 'rxjs';
import { MessageService, TreeNode } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TreeTableModule } from 'primeng/treetable';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { DropdownModule } from 'primeng/dropdown';
import { FileUploadModule } from 'primeng/fileupload';
import { ImageModule } from 'primeng/image';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CategoryDto,
  ICategoryDto,
  CreateCategoryCommand,
  UpdateCategoryCommand,
  ApiBaseService,
  FileParameter
} from '../../../../shared/api/generated/api-service-base.service';
import { AdminExportService } from '../../../../core/services/admin-export.service';
import { AdminCatalogFacade } from '../../services/admin-catalog.facade';

export interface FlatCategory extends ICategoryDto {
  level: number;
}

@Component({
  selector: 'app-admin-catalog-page',
  standalone: true,
  imports: [
    CommonModule,
    AsyncPipe,
    ButtonModule,
    CardModule,
    TreeTableModule,
    TagModule,
    DialogModule,
    InputTextModule,
    InputNumberModule,
    CheckboxModule,
    DropdownModule,
    FileUploadModule,
    ImageModule,
    ReactiveFormsModule
  ],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.scss',
})
export class AdminCatalogPageComponent {
  // Mock Template Data based on user request
  private readonly CATEGORY_TEMPLATES = [
    {
      group: 'Thiết bị điện tử & Công nghệ',
      items: [
        { name: 'Điện thoại & Máy tính bảng', children: ['Điện thoại thông minh', 'Máy tính bảng', 'Phụ kiện điện thoại (ốp lưng, cáp sạc)'] },
        { name: 'Máy tính & Laptop', children: ['Laptop', 'Máy tính để bàn', 'Linh kiện máy tính (RAM, Ổ cứng, VGA)', 'Màn hình'] },
        { name: 'Thiết bị âm thanh', children: ['Tai nghe', 'Loa Bluetooth', 'Dàn âm thanh'] },
        { name: 'Camera & Quay phim', children: ['Máy ảnh', 'Camera giám sát', 'Phụ kiện máy ảnh'] },
        { name: 'Thiết bị thông minh (Smart Home)', children: ['Đồng hồ thông minh', 'Thiết bị nhà thông minh'] }
      ]
    },
    {
      group: 'Thời trang & Phụ kiện',
      items: [
        { name: 'Thời trang Nam', children: ['Áo nam', 'Quần nam', 'Đồ lót nam', 'Đồ ngủ'] },
        { name: 'Thời trang Nữ', children: ['Áo nữ', 'Quần nữ', 'Váy đầm', 'Đồ lót nữ'] },
        { name: 'Giày dép', children: ['Giày nam', 'Giày nữ', 'Giày thể thao', 'Dép & Sandal'] },
        { name: 'Phụ kiện & Trang sức', children: ['Đồng hồ', 'Kính mắt', 'Túi xách', 'Balo', 'Trang sức (vòng, nhẫn)'] }
      ]
    },
    {
      group: 'Nhà cửa & Đời sống',
      items: [
        { name: 'Nội thất', children: ['Nội thất phòng khách', 'Nội thất phòng ngủ', 'Nội thất phòng ăn'] },
        { name: 'Dụng cụ nhà bếp', children: ['Nồi chảo', 'Bát đĩa', 'Dụng cụ nấu ăn', 'Hộp đựng thực phẩm'] },
        { name: 'Điện gia dụng', children: ['Tủ lạnh', 'Máy giặt', 'Lò vi sóng', 'Nồi chiên không dầu', 'Máy hút bụi'] },
        { name: 'Chăm sóc nhà cửa', children: ['Bột giặt', 'Nước lau sàn', 'Dụng cụ vệ sinh'] },
        { name: 'Trang trí nhà cửa', children: ['Đèn trang trí', 'Tranh ảnh', 'Cây cảnh', 'Giấy dán tường'] }
      ]
    },
    {
      group: 'Sức khỏe & Làm đẹp',
      items: [
        { name: 'Chăm sóc da mặt', children: ['Sữa rửa mặt', 'Toner', 'Kem dưỡng da', 'Serum'] },
        { name: 'Trang điểm', children: ['Son môi', 'Kem nền', 'Phấn mắt', 'Dụng cụ trang điểm'] },
        { name: 'Chăm sóc cơ thể & Tóc', children: ['Dầu gội', 'Sữa tắm', 'Dưỡng thể', 'Lăn khử mùi'] },
        { name: 'Thực phẩm chức năng', children: ['Vitamin', 'Hỗ trợ tiêu hóa', 'Giảm cân'] },
        { name: 'Thiết bị chăm sóc sức khỏe', children: ['Máy đo huyết áp', 'Máy massage', 'Cân điện tử'] }
      ]
    }
  ];

  templateOptions: any[] = [];
  categories$: Observable<CategoryDto[]>;
  categoryNodes$: Observable<TreeNode<CategoryDto>[]>;
  flatCategories$: Observable<FlatCategory[]>;
  catalogStats$!: Observable<{
    categories: number;
    activeCategories: number;
  }>;

  categoryForm: FormGroup;
  showCategoryDialog: boolean = false;
  editingCategoryId: string | null = null;
  parentCategoryOptions$: Observable<{label: string, value: string}[]>;
  isSubmitting: boolean = false;
  isUploadingImage: boolean = false;
  private readonly refreshCategories$ = new BehaviorSubject<void>(undefined);

  constructor(
    private readonly catalogFacade: AdminCatalogFacade,
    private readonly apiBase: ApiBaseService,
    private readonly exportService: AdminExportService,
    private readonly messageService: MessageService,
    private readonly fb: FormBuilder
  ) {
    this.categories$ = this.refreshCategories$.pipe(
      switchMap(() => this.catalogFacade.getCategories()),
      shareReplay(1)
    );
    
    this.flatCategories$ = this.categories$.pipe(
      map(cats => this.flattenCategories(cats))
    );
    this.categoryNodes$ = this.categories$.pipe(
      map(cats => this.buildTreeNodes(cats))
    );

    this.catalogStats$ = this.flatCategories$.pipe(
      map((categories) => ({
        categories: categories.length,
        activeCategories: categories.filter((c) => c.isActive).length,
      }))
    );

    this.parentCategoryOptions$ = this.flatCategories$.pipe(
      map(cats => cats.map(c => ({ 
        label: `${'— '.repeat(c.level)}${c.name!}`, 
        value: c.id! 
      })))
    );

    this.categoryForm = this.fb.group({
      name: ['', Validators.required],
      slug: [''],
      iconUrl: [''],
      parentId: [null],
      displayOrder: [0, Validators.required],
      isActive: [true]
    });

    this.prepareTemplateOptions();
  }

  private prepareTemplateOptions(): void {
    const options: any[] = [];
    this.CATEGORY_TEMPLATES.forEach(group => {
      const groupOptions: any[] = [];
      
      group.items.forEach(item => {
        // Add the level 1 category
        const label1 = item.name;
        groupOptions.push({ 
          label: label1, 
          value: { name: item.name, parentSuggest: group.group },
          searchField: this.normalizeSearchText(`${group.group} ${label1}`)
        });
        
        // Add children categories
        item.children.forEach(child => {
          const label2 = child;
          groupOptions.push({ 
            label: `--- ${label2}`, 
            value: { name: child, parentSuggest: item.name },
            searchField: this.normalizeSearchText(`${group.group} ${item.name} ${label2}`)
          });
        });
      });

      options.push({
        label: group.group,
        items: groupOptions
      });
    });
    this.templateOptions = options;
  }

  private normalizeSearchText(text: string): string {
    if (!text) return '';
    return text.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd');
  }

  applyTemplate(event: any): void {
    const template = event.value;
    if (!template) return;

    const name = template.name;
    const slug = this.generateSlug(name);
    
    // Find parentId by name matching in current catalog
    this.flatCategories$.pipe(take(1)).subscribe(allCats => {
      const parentMatch = allCats.find(c => c.name?.toLowerCase() === template.parentSuggest.toLowerCase());
      
      this.categoryForm.patchValue({
        name: name,
        slug: slug,
        parentId: parentMatch ? parentMatch.id : null
      });

      this.messageService.add({
        severity: 'info',
        summary: 'Đã áp dụng mẫu',
        detail: `Đã điền thông tin cho danh mục "${name}".`
      });
    });
  }

  private generateSlug(text: string): string {
    let str = text.toLowerCase();
    
    // Convert Vietnamese characters to English
    str = str.replace(/[áàảãạăắằẳẵặâấầẩẫậ]/g, 'a');
    str = str.replace(/[éèẻẽẹêếềểễệ]/g, 'e');
    str = str.replace(/[íìỉĩị]/g, 'i');
    str = str.replace(/[óòỏõọôốồổỗộơớờởỡợ]/g, 'o');
    str = str.replace(/[úùủũụưứừửữự]/g, 'u');
    str = str.replace(/[ýỳỷỹỵ]/g, 'y');
    str = str.replace(/đ/g, 'd');
    
    return str.trim()
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-')         // Replace multiple - with single -
      .replace(/^-+/, '')             // Trim - from start of text
      .replace(/-+$/, '');            // Trim - from end of text
  }

  reloadCatalog(showNotification: boolean = true): void {
    this.refreshCategories$.next();

    if (showNotification) {
      this.messageService.add({
        severity: 'success',
        summary: 'Thành công',
        detail: 'Dữ liệu danh mục đã được cập nhật.',
      });
    }
  }

  exportCategories(categories: CategoryDto[]): void {
    this.exportService.exportCsv('admin-categories', categories, [
      { header: 'Category ID', value: (c) => c.id },
      { header: 'Tên', value: (c) => c.name },
      { header: 'Slug', value: (c) => c.slug },
      { header: 'Hoạt động', value: (c) => (c.isActive ? 'Có' : 'Không') },
    ]);

    this.messageService.add({
      severity: 'info',
      summary: 'Đã xuất CSV',
      detail: `Đã xuất ${categories.length} dòng danh mục.`,
    });
  }

  exportCurrentCategories(): void {
    this.categories$.pipe(take(1)).subscribe((categories) => {
      this.exportCategories(categories);
    });
  }

  notifyFeaturePending(feature: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Đang phát triển',
      detail: `${feature} sẽ được bổ sung ở bước tiếp theo.`,
    });
  }

  openNewCategory(): void {
    this.editingCategoryId = null;
    this.categoryForm.reset({
      name: '',
      slug: '',
      iconUrl: '',
      parentId: null,
      displayOrder: 0,
      isActive: true
    });
    this.showCategoryDialog = true;
  }

  editCategory(category: CategoryDto): void {
    this.editingCategoryId = category.id!;
    this.categoryForm.patchValue({
      name: category.name,
      slug: category.slug,
      iconUrl: category.iconUrl,
      parentId: category.parentId,
      displayOrder: category.displayOrder,
      isActive: category.isActive
    });
    this.showCategoryDialog = true;
  }

  hideCategoryDialog(): void {
    this.showCategoryDialog = false;
  }

  onFileUpload(event: any): void {
    const file = event.files[0];
    if (!file) return;

    this.isUploadingImage = true;
    const fileParam: FileParameter = {
      data: file,
      fileName: file.name
    };

    this.apiBase.upload(fileParam).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.categoryForm.patchValue({ iconUrl: res.data });
          this.messageService.add({
            severity: 'success',
            summary: 'Tải ảnh thành công',
            detail: 'Ảnh danh mục đã được cập nhật.'
          });
        }
        this.isUploadingImage = false;
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi upload',
          detail: 'Không thể tải ảnh lên server.'
        });
        this.isUploadingImage = false;
      }
    });
  }

  removeImage(): void {
    this.categoryForm.patchValue({ iconUrl: null });
  }

  saveCategory(): void {
    if (this.categoryForm.invalid) {
      this.categoryForm.markAllAsTouched();
      return;
    }
    
    this.isSubmitting = true;
    const formValue = this.categoryForm.value;

    if (this.editingCategoryId) {
      const command = {
        id: this.editingCategoryId,
        name: formValue.name,
        slug: formValue.slug,
        iconUrl: formValue.iconUrl,
        parentId: formValue.parentId,
        displayOrder: formValue.displayOrder,
        isActive: formValue.isActive
      } as UpdateCategoryCommand;

      this.catalogFacade.updateCategory(this.editingCategoryId, command).subscribe(success => {
        this.isSubmitting = false;
        if (success) {
          this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã cập nhật danh mục' });
          this.hideCategoryDialog();
          this.reloadCatalog(false);
        } else {
          this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Cập nhật danh mục thất bại' });
        }
      });
    } else {
      const command = {
        name: formValue.name,
        slug: formValue.slug,
        iconUrl: formValue.iconUrl,
        parentId: formValue.parentId,
        displayOrder: formValue.displayOrder
      } as CreateCategoryCommand;

      this.catalogFacade.createCategory(command).subscribe(success => {
        this.isSubmitting = false;
        if (success) {
          this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã thêm mới danh mục' });
          this.hideCategoryDialog();
          this.reloadCatalog(false);
        } else {
          this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Thêm danh mục thất bại' });
        }
      });
    }
  }

  deactivateCategory(category: CategoryDto): void {
    if (confirm(`Bạn có chắc muốn vô hiệu hóa danh mục "${category.name}"?`)) {
      this.catalogFacade.deactivateCategory(category.id!).subscribe(success => {
        if (success) {
          this.messageService.add({ severity: 'success', summary: 'Thành công', detail: 'Đã vô hiệu hóa danh mục' });
          this.reloadCatalog(false);
        } else {
          this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể vô hiệu hóa' });
        }
      });
    }
  }

  private flattenCategories(categories: CategoryDto[], level: number = 0): FlatCategory[] {
    let result: FlatCategory[] = [];
    for (const cat of categories) {
      result.push({ ...cat, level });
      if (cat.children && cat.children.length > 0) {
        result.push(...this.flattenCategories(cat.children, level + 1));
      }
    }
    return result;
  }

  private buildTreeNodes(categories: CategoryDto[]): TreeNode<CategoryDto>[] {
    return categories.map(cat => ({
      data: cat,
      children: cat.children && cat.children.length > 0 ? this.buildTreeNodes(cat.children) : undefined,
      expanded: true
    }));
  }

}
