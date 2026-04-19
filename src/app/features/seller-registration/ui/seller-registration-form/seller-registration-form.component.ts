import {
  Component, Input, Output, EventEmitter,
  OnInit, OnChanges, SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder, FormGroup, ReactiveFormsModule,
  Validators, AbstractControl, ValidationErrors, AsyncValidatorFn,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { switchMap, map, first } from 'rxjs/operators';
import { Observable, of, timer } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/dropdown';
import {
  SellerRegistrationFormValue,
  SellerRegistrationState,
  SellerShopInfo,
} from '../../../../entities/seller/model/seller.model';

export function noWhitespaceValidator(control: AbstractControl): ValidationErrors | null {
  const v = control.value as string;
  if (v && v.trim().length === 0) return { whitespace: true };
  return null;
}

export function slugPatternValidator(control: AbstractControl): ValidationErrors | null {
  const v = control.value as string;
  if (!v) return null;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v) ? null : { slugPattern: true };
}

@Component({
  selector: 'app-seller-registration-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    ButtonModule, InputTextModule, TextareaModule, TooltipModule, DropdownModule,
  ],
  templateUrl: './seller-registration-form.component.html',
  styleUrl: './seller-registration-form.component.scss',
})
export class SellerRegistrationFormComponent implements OnInit, OnChanges {
  @Input() state: SellerRegistrationState = 'idle';
  @Input() slugError: string | null = null;
  @Input() rejectedShopInfo: SellerShopInfo | null = null;
  @Input() checkSlugFn?: (slug: string) => Observable<boolean>;

  @Output() formSubmit = new EventEmitter<SellerRegistrationFormValue>();
  @Output() nameChange = new EventEmitter<string>();

  form!: FormGroup;
  isSlugManuallyEdited = false;
  sameAsShopAddress = false;

  // Shared provinces (dùng cho cả 2 section)
  provinces: any[] = [];
  isLoadingProvinces = false;

  // Shop address dropdowns
  shopDistricts: any[] = [];
  shopWards: any[] = [];
  isLoadingShopDistricts = false;
  isLoadingShopWards = false;

  // Pickup address dropdowns
  districts: any[] = [];
  wards: any[] = [];
  isLoadingDistricts = false;
  isLoadingWards = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly http: HttpClient,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: [
        this.rejectedShopInfo?.name ?? '',
        [Validators.required, Validators.maxLength(100), noWhitespaceValidator],
      ],
      slug: [
        this.rejectedShopInfo?.slug ?? '',
        [Validators.required, Validators.maxLength(50), slugPatternValidator],
        this.checkSlugFn ? [this.createSlugAsyncValidator()] : [],
      ],
      description: [this.rejectedShopInfo?.description ?? '', [Validators.maxLength(500)]],
      // Shop address (hiển thị)
      shopProvince: [null],
      shopDistrict: [{ value: null, disabled: true }],
      shopWard: [{ value: null, disabled: true }],
      shopStreet: ['', [Validators.maxLength(200)]],
      // Pickup address (logistics) — ghi vào DB
      province: [null],
      district: [{ value: null, disabled: true }],
      ward: [{ value: null, disabled: true }],
      street: ['', [Validators.maxLength(200)]],
    });

    if (this.state === 'loading') this.form.disable();
    this.loadProvinces();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.form) return;

    if (changes['state']) {
      if (this.state === 'loading') {
        this.form.disable();
      } else {
        this.form.enable();
        this.restoreDisabledStates();
      }
    }

    if (changes['slugError'] && this.slugError) {
      this.form.get('slug')?.setErrors({ serverError: this.slugError });
    } else if (changes['slugError'] && !this.slugError) {
      const ctrl = this.form.get('slug');
      if (ctrl?.errors?.['serverError']) {
        const errors = { ...ctrl.errors };
        delete errors['serverError'];
        ctrl.setErrors(Object.keys(errors).length ? errors : null);
      }
    }
  }

  // ── Same address toggle ──

  toggleSameAddress(): void {
    this.sameAsShopAddress = !this.sameAsShopAddress;
    if (this.sameAsShopAddress) {
      this.copyShopToPickup();
    }
  }

  private copyShopToPickup(): void {
    const shopProvince = this.form.get('shopProvince')?.value;
    const shopDistrict = this.form.get('shopDistrict')?.value;
    const shopWard = this.form.get('shopWard')?.value;
    const shopStreet = this.form.get('shopStreet')?.value;

    this.form.get('province')?.setValue(shopProvince);
    this.form.get('street')?.setValue(shopStreet);

    if (shopProvince) {
      this.loadPickupDistricts(shopProvince.code, () => {
        this.form.get('district')?.setValue(shopDistrict);
        if (shopDistrict) {
          this.loadPickupWards(shopDistrict.code, () => {
            this.form.get('ward')?.setValue(shopWard);
          });
        }
      });
    }
  }

  // ── Shop address API ──

  onShopProvinceChange(): void {
    this.shopDistricts = [];
    this.shopWards = [];
    this.form.get('shopDistrict')?.setValue(null);
    this.form.get('shopWard')?.setValue(null);
    this.form.get('shopDistrict')?.disable();
    this.form.get('shopWard')?.disable();

    const province = this.form.get('shopProvince')?.value;
    if (!province) return;

    this.isLoadingShopDistricts = true;
    this.http.get<any>(`https://provinces.open-api.vn/api/p/${province.code}?depth=2`).subscribe({
      next: (data) => {
        this.shopDistricts = data.districts ?? [];
        this.form.get('shopDistrict')?.enable();
        this.isLoadingShopDistricts = false;
        if (this.sameAsShopAddress) this.copyShopToPickup();
      },
      error: () => { this.isLoadingShopDistricts = false; },
    });
  }

  onShopDistrictChange(): void {
    this.shopWards = [];
    this.form.get('shopWard')?.setValue(null);
    this.form.get('shopWard')?.disable();

    const district = this.form.get('shopDistrict')?.value;
    if (!district) return;

    this.isLoadingShopWards = true;
    this.http.get<any>(`https://provinces.open-api.vn/api/d/${district.code}?depth=2`).subscribe({
      next: (data) => {
        this.shopWards = data.wards ?? [];
        this.form.get('shopWard')?.enable();
        this.isLoadingShopWards = false;
        if (this.sameAsShopAddress) this.copyShopToPickup();
      },
      error: () => { this.isLoadingShopWards = false; },
    });
  }

  // ── Pickup address API ──

  onProvinceChange(): void {
    this.districts = [];
    this.wards = [];
    this.form.get('district')?.setValue(null);
    this.form.get('ward')?.setValue(null);
    this.form.get('district')?.disable();
    this.form.get('ward')?.disable();

    const province = this.form.get('province')?.value;
    if (!province) return;

    this.loadPickupDistricts(province.code);
  }

  onDistrictChange(): void {
    this.wards = [];
    this.form.get('ward')?.setValue(null);
    this.form.get('ward')?.disable();

    const district = this.form.get('district')?.value;
    if (!district) return;

    this.loadPickupWards(district.code);
  }

  private loadPickupDistricts(provinceCode: number, callback?: () => void): void {
    this.isLoadingDistricts = true;
    this.http.get<any>(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`).subscribe({
      next: (data) => {
        this.districts = data.districts ?? [];
        this.form.get('district')?.enable();
        this.isLoadingDistricts = false;
        callback?.();
      },
      error: () => { this.isLoadingDistricts = false; },
    });
  }

  private loadPickupWards(districtCode: number, callback?: () => void): void {
    this.isLoadingWards = true;
    this.http.get<any>(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`).subscribe({
      next: (data) => {
        this.wards = data.wards ?? [];
        this.form.get('ward')?.enable();
        this.isLoadingWards = false;
        callback?.();
      },
      error: () => { this.isLoadingWards = false; },
    });
  }

  private loadProvinces(): void {
    this.isLoadingProvinces = true;
    this.http.get<any[]>('https://provinces.open-api.vn/api/p/').subscribe({
      next: (data) => { this.provinces = data; this.isLoadingProvinces = false; },
      error: () => { this.isLoadingProvinces = false; },
    });
  }

  // ── Form helpers ──

  onNameInput(): void {
    const name = this.form.get('name')?.value as string;
    this.nameChange.emit(name);
    if (!this.isSlugManuallyEdited) {
      this.form.get('slug')?.setValue(this.generateSlugLocally(name), { emitEvent: true });
    }
  }

  onSlugInput(): void {
    this.isSlugManuallyEdited = true;
    const ctrl = this.form.get('slug');
    if (ctrl?.errors?.['serverError']) {
      const errors = { ...ctrl.errors };
      delete errors['serverError'];
      ctrl.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  onSubmit(): void {
    if (this.form.invalid || this.state === 'loading') {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const value: SellerRegistrationFormValue = {
      name: v.name,
      slug: v.slug,
      description: v.description,
      // Ghi đúng vào DB: province_id, district_id, ward_id, pickup_address
      provinceId: v.province?.code ?? undefined,
      districtId: v.district?.code ?? undefined,
      wardId: v.ward?.code ?? undefined,
      pickupAddress: v.street?.trim() || undefined,
    };
    this.formSubmit.emit(value);
  }

  // Getters
  get nameControl() { return this.form.get('name'); }
  get slugControl() { return this.form.get('slug'); }
  get descriptionControl() { return this.form.get('description'); }
  get shopProvinceControl() { return this.form.get('shopProvince'); }
  get shopDistrictControl() { return this.form.get('shopDistrict'); }
  get shopWardControl() { return this.form.get('shopWard'); }
  get shopStreetControl() { return this.form.get('shopStreet'); }
  get provinceControl() { return this.form.get('province'); }
  get districtControl() { return this.form.get('district'); }
  get wardControl() { return this.form.get('ward'); }
  get streetControl() { return this.form.get('street'); }
  get isLoading(): boolean { return this.state === 'loading'; }

  private restoreDisabledStates(): void {
    if (!this.form.get('shopProvince')?.value) this.form.get('shopDistrict')?.disable();
    if (!this.form.get('shopDistrict')?.value) this.form.get('shopWard')?.disable();
    if (!this.form.get('province')?.value) this.form.get('district')?.disable();
    if (!this.form.get('district')?.value) this.form.get('ward')?.disable();
  }

  private generateSlugLocally(name: string): string {
    return name.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
  }

  private createSlugAsyncValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      const value = control.value as string;
      if (!value || !this.checkSlugFn) return of(null);
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) return of(null);
      return timer(400).pipe(
        switchMap(() => this.checkSlugFn!(value)),
        map((isAvailable) => (isAvailable ? null : { slugTaken: true })),
        first(),
      );
    };
  }
}
