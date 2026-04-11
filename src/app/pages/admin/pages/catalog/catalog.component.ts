import { AsyncPipe, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { combineLatest, map, Observable, take } from 'rxjs';
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
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CategoryDto,
  ICategoryDto,
  CreateCategoryCommand,
  UpdateCategoryCommand
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
    ReactiveFormsModule
  ],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.scss',
})
export class AdminCatalogPageComponent {
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

  constructor(
    private readonly catalogFacade: AdminCatalogFacade,
    private readonly exportService: AdminExportService,
    private readonly messageService: MessageService,
    private readonly fb: FormBuilder
  ) {
    this.categories$ = this.catalogFacade.getCategories();
    this.flatCategories$ = this.categories$.pipe(
      map(cats => this.flattenCategories(cats))
    );
    this.categoryNodes$ = this.categories$.pipe(
      map(cats => this.buildTreeNodes(cats))
    );
    this.rebindStreams();

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
  }

  reloadCatalog(): void {
    this.categories$ = this.catalogFacade.getCategories();
    this.rebindStreams();

    this.messageService.add({
      severity: 'success',
      summary: 'Thành công',
      detail: 'Dữ liệu danh mục đã được cập nhật.',
    });
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
          this.reloadCatalog();
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
          this.reloadCatalog();
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
          this.reloadCatalog();
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

  private rebindStreams(): void {
    this.catalogStats$ = this.flatCategories$.pipe(
      map((categories) => ({
        categories: categories.length,
        activeCategories: categories.filter((c) => c.isActive).length,
      }))
    );
  }
}
