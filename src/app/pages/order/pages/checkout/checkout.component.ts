import { Component, OnInit, signal, effect, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
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
  ShippingFeeRequest,
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
  shippingFee = 0;
  shippingFeeLoading = false;
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

  // Shipping: dùng GHN động thay vì cố định
  shippingProvider = 'GHN';
  shippingEstimate = '';

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
    private apiService: ApiBaseService,
    private cartService: CartService,
    private router: Router,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.fetchProvinces();
      this.loadCartData();
      this.loadAddresses();
    }
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
            isDefault: a.isDefault,
            districtId: a.districtId,
            wardId: a.wardId,
          }));
          const defaultAddr = this.savedAddresses.find(a => a.isDefault);
          if (defaultAddr) {
            this.selectedAddressId = defaultAddr.id;
            this.calculateShippingFee();
          } else if (this.savedAddresses.length > 0) {
            this.selectedAddressId = this.savedAddresses[0].id;
            this.calculateShippingFee();
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

  // ─── GHN Address API (thay thế provinces.open-api.vn) ────

  fetchProvinces() {
    this.apiService.provinces().subscribe({
      next: (res) => {
        this.provinces = (res.data || []).map((p: any) => ({
          code: p.provinceID,
          name: p.provinceName,
        }));
      },
      error: (err) => console.error('Failed to fetch GHN provinces', err),
    });
  }

  onProvinceChange() {
    this.districts = [];
    this.wards = [];
    this.newAddress.district = null;
    this.newAddress.ward = null;
    if (this.newAddress.province) {
      this.apiService
        .districts(this.newAddress.province.code)
        .subscribe({
          next: (res) => {
            this.districts = (res.data || []).map((d: any) => ({
              code: d.districtID,
              name: d.districtName,
            }));
          },
        });
    }
  }

  onDistrictChange() {
    this.wards = [];
    this.newAddress.ward = null;
    if (this.newAddress.district) {
      this.apiService
        .wards(this.newAddress.district.code)
        .subscribe({
          next: (res) => {
            this.wards = (res.data || []).map((w: any) => ({
              code: w.wardCode,
              name: w.wardName,
            }));
          },
        });
    }
  }

  // ─── Dynamic Shipping Fee (GHN API) ─────────────────────

  calculateShippingFee() {
    const addr = this.getSelectedAddress();
    if (!addr || !addr.districtId) {
      this.shippingFee = 30000; // Fallback
      this.shippingEstimate = '';
      this.updateTotal();
      return;
    }

    this.shippingFeeLoading = true;
    
    // Dùng shopId của item đầu tiên trong giỏ hàng để lấy địa chỉ lấy hàng
    const firstShopId = this.cartItems.length > 0 ? this.cartItems[0].shopId : null;

    const req = new ShippingFeeRequest({
      shopId: firstShopId || undefined,
      fromDistrictId: 0,
      fromWardCode: '',
      toDistrictId: addr.districtId,
      toWardCode: addr.wardId?.toString() || '',
      weight: 500,
      insuranceValue: Math.min(Math.round(this.merchandiseSubtotal), 5000000),
    });

    this.apiService.calculateFee(req).subscribe({
      next: (res) => {
        this.shippingFeeLoading = false;
        if (res.success && res.data) {
          this.shippingFee = res.data.totalFee || 0;
          this.shippingEstimate = 'Giao hàng dự kiến 2-3 ngày';
        } else {
          this.shippingFee = 30000;
          this.shippingEstimate = '';
        }
        this.updateTotal();
      },
      error: () => {
        this.shippingFeeLoading = false;
        this.shippingFee = 30000; // Fallback
        this.shippingEstimate = '';
        this.updateTotal();
      }
    });
  }

  // ─── Address Management ─────────────────────────────────

  openAddressModal() {
    this.showAddressDialog = true;
    this.showNewAddressForm = false;
  }

  confirmSelectAddress() {
    this.showAddressDialog = false;
    this.calculateShippingFee(); // Tính lại phí ship khi đổi địa chỉ
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
    
    // Lưu mã GHN vào backend (thay vì mã open-api)
    this.apiService.addressesPOST(new AddAddressCommand({
       fullName: this.newAddress.name,
       phoneNumber: this.newAddress.phone,
       provinceId: Number(this.newAddress.province.code),
       districtId: Number(this.newAddress.district.code),
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

  deleteAddress(id: string, event: Event) {
    event.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa địa chỉ này?')) return;
    
    this.apiService.addressesDELETE(id).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.savedAddresses = this.savedAddresses.filter((a) => a.id !== id);
          if (this.selectedAddressId === id) {
             const defaultAddr = this.savedAddresses.find(a => a.isDefault);
             this.selectedAddressId = defaultAddr ? defaultAddr.id : (this.savedAddresses.length > 0 ? this.savedAddresses[0].id : null);
             this.calculateShippingFee();
          }
        } else {
          alert('Lỗi xóa địa chỉ: ' + res.message);
        }
      },
      error: () => alert('Lỗi hệ thống khi xóa địa chỉ')
    });
  }

  // ─── Formatting & Totals ─────────────────────────────────

  formatPrice(price?: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price || 0);
  }

  updateTotal() {
    this.totalPayment =
      this.merchandiseSubtotal + this.shippingFee - this.discount;
  }

  // ─── Place Order ─────────────────────────────────────────

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
        const orders = res.data || [];
        if (orders.length === 0) {
          alert('Không thể tạo đơn hàng.');
          this.isPlacingOrder = false;
          return;
        }

        if (this.selectedPayment === 'vnpay') {
          // Gửi TẤT CẢ orderIds để gộp thanh toán 1 lần VNPay
          const allOrderIds = orders.map((o: any) => o.id).filter(Boolean);
          const payReq = new CreatePaymentUrlRequest({ 
            orderId: allOrderIds[0], 
            orderIds: allOrderIds 
          });
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
