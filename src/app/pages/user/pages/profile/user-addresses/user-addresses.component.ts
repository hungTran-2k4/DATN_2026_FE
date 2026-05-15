import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { MessageService } from 'primeng/api';
import {
  AddAddressCommand,
  ApiBaseService,
  UpdateAddressCommand,
} from '../../../../../shared/api/generated/api-service-base.service';

@Component({
  selector: 'app-user-addresses',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    DropdownModule,
  ],
  templateUrl: './user-addresses.component.html',
})
export class UserAddressesComponent implements OnInit {
  savedAddresses: any[] = [];

  showAddressDialog = false;
  isEditing = false;
  editingAddressId: string | null = null;

  // GHN Dropdowns
  provinces: any[] = [];
  districts: any[] = [];
  wards: any[] = [];

  newAddress: any = {
    name: '',
    phone: '',
    street: '',
    province: null,
    district: null,
    ward: null,
  };

  isSaving = false;

  constructor(
    private readonly apiService: ApiBaseService,
    private readonly messageService: MessageService,
  ) {}

  ngOnInit(): void {
    this.loadAddresses();
    this.loadProvinces();
  }

  loadAddresses() {
    this.apiService.addressesGET().subscribe({
      next: (res: any) => {
        if (res.data) {
          this.savedAddresses = res.data.map((a: any) => ({
            id: a.id,
            name: a.fullName,
            phone: a.phoneNumber,
            address: a.detailedAddress,
            isDefault: a.isDefault,
            provinceId: a.provinceId,
            districtId: a.districtId,
            wardId: a.wardId,
          }));
        }
      },
    });
  }

  loadProvinces() {
    this.apiService.provinces().subscribe({
      next: (res: any) => {
        this.provinces = (res.data || []).map((p: any) => ({
          code: p.provinceID ?? p.provinceId,
          name: p.provinceName ?? p.provinceName,
        }));
      },
    });
  }

  onProvinceChange() {
    this.districts = [];
    this.wards = [];
    this.newAddress.district = null;
    this.newAddress.ward = null;
    if (this.newAddress.province) {
      this.apiService.districts(this.newAddress.province.code).subscribe({
        next: (res: any) => {
          this.districts = (res.data || []).map((d: any) => ({
            code: d.districtID ?? d.districtId,
            name: d.districtName ?? d.districtName,
          }));
        },
      });
    }
  }

  onDistrictChange() {
    this.wards = [];
    this.newAddress.ward = null;
    if (this.newAddress.district) {
      this.apiService.wards(this.newAddress.district.code).subscribe({
        next: (res: any) => {
          this.wards = (res.data || []).map((w: any) => ({
            code: w.wardCode ?? w.WardCode,
            name: w.wardName ?? w.WardName,
          }));
        },
      });
    }
  }

  openNewAddress() {
    this.isEditing = false;
    this.editingAddressId = null;
    this.newAddress = {
      name: '',
      phone: '',
      street: '',
      province: null,
      district: null,
      ward: null,
    };
    this.districts = [];
    this.wards = [];
    this.showAddressDialog = true;
  }

  openEditAddress(addr: any) {
    this.isEditing = true;
    this.editingAddressId = addr.id;

    // Parse street name from detailedAddress (usually format: "Street, Ward, District, Province")
    const parts = addr.address ? addr.address.split(', ') : [];
    const street = parts.length > 0 ? parts[0] : '';

    this.newAddress = {
      name: addr.name,
      phone: addr.phone,
      street: street,
      province: this.provinces.find((p) => p.code == addr.provinceId),
      district: null,
      ward: null,
    };

    if (this.newAddress.province) {
      this.apiService.districts(this.newAddress.province.code).subscribe({
        next: (res: any) => {
          this.districts = (res.data || []).map((d: any) => ({
            code: d.districtID,
            name: d.districtName,
          }));
          this.newAddress.district = this.districts.find(
            (d) => d.code == addr.districtId,
          );

          if (this.newAddress.district) {
            this.apiService.wards(this.newAddress.district.code).subscribe({
              next: (wRes: any) => {
                this.wards = (wRes.data || []).map((w: any) => ({
                  code: w.wardCode,
                  name: w.wardName,
                }));
                this.newAddress.ward = this.wards.find(
                  (w) => w.code == addr.wardId,
                );
              },
            });
          }
        },
      });
    }
    this.showAddressDialog = true;
  }

  saveAddress() {
    if (
      !this.newAddress.name ||
      !this.newAddress.phone ||
      !this.newAddress.street ||
      !this.newAddress.province ||
      !this.newAddress.district ||
      !this.newAddress.ward
    ) {
      this.messageService.add({
        severity: 'error',
        summary: 'Lỗi',
        detail: 'Vui lòng điền đủ thông tin!',
      });
      return;
    }

    const fullAddress = `${this.newAddress.street}, ${this.newAddress.ward.name}, ${this.newAddress.district.name}, ${this.newAddress.province.name}`;
    this.isSaving = true;

    if (this.isEditing && this.editingAddressId) {
      // @ts-ignore
      this.apiService
        .addressesPUT(
          this.editingAddressId,
          new UpdateAddressCommand({
            id: this.editingAddressId,
            fullName: this.newAddress.name,
            phoneNumber: this.newAddress.phone,
            provinceId: Number(this.newAddress.province.code),
            districtId: Number(this.newAddress.district.code),
            wardId: this.newAddress.ward.code,
            detailedAddress: fullAddress,
            isDefault:
              this.savedAddresses.find((a) => a.id === this.editingAddressId)
                ?.isDefault || false,
          }),
        )
        .subscribe({
          next: (res: any) => {
            this.isSaving = false;
            if (res.success) {
              this.loadAddresses();
              this.showAddressDialog = false;
              this.messageService.add({
                severity: 'success',
                summary: 'Thành công',
                detail: 'Cập nhật địa chỉ thành công!',
              });
            } else {
              this.messageService.add({
                severity: 'error',
                summary: 'Lỗi',
                detail: res.message,
              });
            }
          },
          error: () => {
            this.isSaving = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Lỗi',
              detail: 'Lỗi hệ thống',
            });
          },
        });
    } else {
      this.apiService
        .addressesPOST(
          new AddAddressCommand({
            fullName: this.newAddress.name,
            phoneNumber: this.newAddress.phone,
            provinceId: Number(this.newAddress.province.code),
            districtId: Number(this.newAddress.district.code),
            wardId: this.newAddress.ward.code,
            detailedAddress: fullAddress,
            isDefault: this.savedAddresses.length === 0,
          }),
        )
        .subscribe({
          next: (res: any) => {
            this.isSaving = false;
            if (res.success) {
              this.loadAddresses();
              this.showAddressDialog = false;
              this.messageService.add({
                severity: 'success',
                summary: 'Thành công',
                detail: 'Thêm địa chỉ mới thành công!',
              });
            } else {
              this.messageService.add({
                severity: 'error',
                summary: 'Lỗi',
                detail: res.message,
              });
            }
          },
          error: () => {
            this.isSaving = false;
            this.messageService.add({
              severity: 'error',
              summary: 'Lỗi',
              detail: 'Lỗi hệ thống',
            });
          },
        });
    }
  }

  deleteAddress(id: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) return;

    this.apiService.addressesDELETE(id).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.loadAddresses();
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã xóa địa chỉ!',
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Lỗi',
            detail: res.message,
          });
        }
      },
      error: () =>
        this.messageService.add({
          severity: 'error',
          summary: 'Lỗi',
          detail: 'Lỗi hệ thống',
        }),
    });
  }

  setDefaultAddress(id: string) {
    // @ts-ignore
    this.apiService.defaultPATCH(id).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.loadAddresses();
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đã thiết lập địa chỉ mặc định!',
          });
        }
      },
    });
  }
}
