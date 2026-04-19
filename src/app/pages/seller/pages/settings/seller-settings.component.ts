import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { SkeletonModule } from 'primeng/skeleton';
import { ApiBaseService, UpdateShopCommand } from '../../../../shared/api/generated/api-service-base.service';
import { SellerRegistrationService } from '../../../../features/seller-registration/model/seller-registration.service';
import { SellerShopInfo } from '../../../../entities/seller/model/seller.model';

@Component({
  selector: 'app-seller-settings',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    ButtonModule, InputTextModule, TextareaModule, ToastModule, SkeletonModule,
  ],
  providers: [MessageService],
  templateUrl: './seller-settings.component.html',
  styleUrl: './seller-settings.component.scss',
})
export class SellerSettingsComponent implements OnInit {
  private readonly destroy$ = new Subject<void>();

  shopInfo: SellerShopInfo | null = null;
  form!: FormGroup;
  isSaving = false;
  isLoading = true;

  constructor(
    private readonly fb: FormBuilder,
    private readonly api: ApiBaseService,
    private readonly sellerService: SellerRegistrationService,
    private readonly messageService: MessageService,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', [Validators.maxLength(1000)]],
      pickupAddress: ['', [Validators.maxLength(500)]],
    });

    if (isPlatformBrowser(this.platformId)) {
      this.sellerService.shopInfo$.pipe(takeUntil(this.destroy$)).subscribe((shop) => {
        if (shop) {
          this.shopInfo = shop;
          this.form.patchValue({ name: shop.name, description: shop.description ?? '', pickupAddress: shop.pickupAddress ?? '' });
          this.isLoading = false;
        }
      });
      this.sellerService.initState();
    }
  }

  save(): void {
    if (this.form.invalid || !this.shopInfo?.id) return;
    this.isSaving = true;
    const v = this.form.value;
    const cmd = new UpdateShopCommand({ id: this.shopInfo.id, name: v.name, description: v.description, pickupAddress: v.pickupAddress });
    this.api.shopsPUT(this.shopInfo.id, cmd).subscribe({
      next: (res: any) => {
        this.isSaving = false;
        if (res?.success !== false) {
          this.messageService.add({ severity: 'success', summary: 'Đã lưu', detail: 'Thông tin cửa hàng đã được cập nhật.' });
        }
      },
      error: () => { this.isSaving = false; this.messageService.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể lưu thông tin.' }); },
    });
  }
}
