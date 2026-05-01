import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { RadioButtonModule } from 'primeng/radiobutton';
import { NgOptimizedImage } from '@angular/common';
import {
  ApiBaseService,
  CheckoutCommand,
  CreatePaymentUrlRequest,
  CartItemDto,
  AddAddressCommand,
} from '../../../../shared/api/generated/api-service-base.service';
import { CartService } from '../../../../features/cart/model/cart.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    ButtonModule,
    DropdownModule,
    DialogModule,
    InputTextModule,
    InputTextarea,
    RadioButtonModule,
    NgOptimizedImage,
  ],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.scss',
})
export class CheckoutComponent implements OnInit {
  cartItems: CartItemDto[] = [];
  merchandiseSubtotal = 0;
  shippingFee = 35000;
  discount = 0;
  totalPayment = 0;

  savedAddresses: any[] = [];
  selectedAddressId: string | null = null;

  showAddressDialog: boolean = false;
  showNewAddressForm: boolean = false;

  newAddress = {
    name: '',
    phone: '',
    street: '',
    province: null as any,
    district: null as any,
    ward: null as any,
  };

  provinces: any[] = [];
  districts: any[] = [];
  wards: any[] = [];

  shippingOptions = [
    {
      id: 'express',
      name: 'Giao Hàng Nhanh',
      duration: 'Nhận hàng sau 2-3 ngày',
      price: 35000,
    },
    {
      id: 'standard',
      name: 'Giao Hàng Tiết Kiệm',
      duration: 'Nhận hàng sau 4-5 ngày',
      price: 15000,
    },
  ];
  selectedShipping: string = 'express';

  paymentMethods = [
    {
      id: 'cod',
      name: 'Thanh toán khi nhận hàng (COD)',
      icon: 'pi-money-bill',
    },
    { id: 'vnpay', name: 'Thẻ ATM Nội địa / VNPAY', icon: 'pi-credit-card' },
  ];
  selectedPayment: string = 'cod';
  orderNote: string = '';
  isPlacingOrder = false;

  constructor(
    private http: HttpClient,
    private apiService: ApiBaseService,
    private cartService: CartService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.fetchProvinces();
    this.loadCartData();
    this.loadAddresses();
  }

  loadAddresses() {
    this.apiService.addressesGET().subscribe({
      next: (res) => {
        if (res.data) {
          this.savedAddresses = res.data.map((a: any) => ({
            id: a.id,
            name: a.fullName,
            phone: a.phoneNumber,
            address: a.detailedAddress,
            isDefault: a.isDefault
          }));
          const defaultAddr = this.savedAddresses.find(a => a.isDefault);
          if (defaultAddr) {
            this.selectedAddressId = defaultAddr.id;
          } else if (this.savedAddresses.length > 0) {
            this.selectedAddressId = this.savedAddresses[0].id;
          }
        }
      }
    });
  }

  loadCartData() {
    this.cartService.loadCart().subscribe((cart) => {
      if (cart) {
        this.cartItems = (cart.groups || []).flatMap((g) => g.items || []);
        this.merchandiseSubtotal = cart.grandTotal || 0;
        this.updateTotal();
      }
    });
  }

  fetchProvinces() {
    this.http.get<any[]>('https://provinces.open-api.vn/api/p/').subscribe({
      next: (data) => (this.provinces = data),
      error: (err) => console.error('Failed to fetch provinces', err),
    });
  }

  onProvinceChange() {
    this.districts = [];
    this.wards = [];
    this.newAddress.district = null;
    this.newAddress.ward = null;
    if (this.newAddress.province) {
      this.http
        .get<any>(
          `https://provinces.open-api.vn/api/p/${this.newAddress.province.code}?depth=2`,
        )
        .subscribe({
          next: (data) => (this.districts = data.districts || []),
        });
    }
  }

  onDistrictChange() {
    this.wards = [];
    this.newAddress.ward = null;
    if (this.newAddress.district) {
      this.http
        .get<any>(
          `https://provinces.open-api.vn/api/d/${this.newAddress.district.code}?depth=2`,
        )
        .subscribe({
          next: (data) => (this.wards = data.wards || []),
        });
    }
  }

  openAddressModal() {
    this.showAddressDialog = true;
    this.showNewAddressForm = false;
  }

  confirmSelectAddress() {
    this.showAddressDialog = false;
  }

  triggerNewAddressForm() {
    this.showNewAddressForm = true;
  }

  saveNewAddress() {
    if (
      !this.newAddress.name ||
      !this.newAddress.phone ||
      !this.newAddress.street ||
      !this.newAddress.province ||
      !this.newAddress.district ||
      !this.newAddress.ward
    ) {
      alert('Vui lòng điền đủ thông tin!');
      return;
    }
    const fullAddress = `${this.newAddress.street}, ${this.newAddress.ward.name}, ${this.newAddress.district.name}, ${this.newAddress.province.name}`;
    
    // Save to backend
    this.apiService.addressesPOST(new AddAddressCommand({
       fullName: this.newAddress.name,
       phoneNumber: this.newAddress.phone,
       provinceId: this.newAddress.province.code,
       districtId: this.newAddress.district.code,
       wardId: this.newAddress.ward.code,
       detailedAddress: fullAddress,
       isDefault: this.savedAddresses.length === 0,
    })).subscribe({
       next: (res) => {
          if (res.success && res.data) {
             this.loadAddresses();
             this.selectedAddressId = res.data.id!;
             this.showNewAddressForm = false;
             this.showAddressDialog = false;
          } else {
             alert('Lỗi lưu địa chỉ: ' + res.message);
          }
       },
       error: () => alert('Lỗi hệ thống khi lưu địa chỉ')
    });
  }

  getSelectedAddress() {
    return this.savedAddresses.find((a) => a.id === this.selectedAddressId);
  }

  formatPrice(price?: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price || 0);
  }

  updateTotal() {
    const shipping = this.shippingOptions.find(
      (opt) => opt.id === this.selectedShipping,
    );
    this.shippingFee = shipping ? shipping.price : 0;
    this.totalPayment =
      this.merchandiseSubtotal + this.shippingFee - this.discount;
  }

  placeOrder() {
    if (this.cartItems.length === 0) {
      alert('Giỏ hàng trống!');
      return;
    }

    if (!this.selectedAddressId) {
      alert('Vui lòng chọn hoặc thêm địa chỉ nhận hàng!');
      return;
    }

    this.isPlacingOrder = true;
    const address = this.getSelectedAddress();

    const command = new CheckoutCommand({
      cartItemIds: this.cartItems.map((item) => item.id!),
      customerNote: this.orderNote,
      shippingAddressId: this.selectedAddressId!,
      paymentMethod: this.selectedPayment === 'vnpay' ? 'VNPAY' : 'COD'
    });

    this.apiService.checkout(command).subscribe({
      next: (res) => {
        const orderId = res.data?.[0]?.id;
        if (!orderId) {
          alert('Không thể tạo đơn hàng.');
          this.isPlacingOrder = false;
          return;
        }

        if (this.selectedPayment === 'vnpay') {
          const payReq = new CreatePaymentUrlRequest({ orderId });
          this.apiService.createPaymentUrl(payReq).subscribe({
            next: (payRes) => {
              if (payRes.success && payRes.paymentUrl) {
                window.location.href = payRes.paymentUrl;
              } else {
                alert(
                  'Lỗi tạo liên kết thanh toán. Vui lòng thử lại trong Lịch sử đơn hàng.',
                );
                this.router.navigate(['/user/profile/orders']);
              }
            },
            error: () => {
              alert('Lỗi kết nối thanh toán.');
              this.router.navigate(['/user/profile/orders']);
            },
          });
        } else {
          alert('Đặt hàng thành công!');
          this.cartService.clearCart().subscribe();
          this.router.navigate(['/profile'], { queryParams: { tab: 'purchases' } });
        }
      },
      error: (err) => {
        this.isPlacingOrder = false;
        alert('Có lỗi xảy ra khi đặt hàng.');
      },
    });
  }
}
