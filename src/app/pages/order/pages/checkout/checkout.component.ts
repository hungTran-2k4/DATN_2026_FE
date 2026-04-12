import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { RadioButtonModule } from 'primeng/radiobutton';
import { NgOptimizedImage } from '@angular/common';

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
  // --- MOCK CART DATA ---
  cartItems = [
    {
      name: 'Giày Thể Thao Nam Nữ Dễ Phối Đồ, Bền Đẹp, Êm Chân',
      variant: 'Đồng xu box bill, 41',
      image:
        'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&q=80&w=200',
      price: 320000,
      quantity: 1,
    },
    {
      name: 'BST 50 - Áo thun nam nữ form rộng vải dày mịn cá tính',
      variant: 'Mẫu 1, Size XS',
      image:
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=200',
      price: 20900,
      quantity: 2,
    },
  ];

  merchandiseSubtotal = 361800; // 320000 + 41800
  shippingFee = 35000;
  discount = 15000;
  totalPayment = 381800;

  // --- ADDRESS LOGIC ---
  savedAddresses = [
    {
      id: 1,
      name: 'Nguyễn Văn A',
      phone: '(+84) 912345678',
      address: '123 Đường Điện Biên Phủ, Phường Đa Kao, Quận 1, TP Hồ Chí Minh',
      isDefault: true,
    },
    {
      id: 2,
      name: 'Trần Thị B',
      phone: '(+84) 987654321',
      address: '456 Lê Lợi, Phường Bến Nghé, Quận 1, TP Hồ Chí Minh',
      isDefault: false,
    },
  ];
  selectedAddressId: number | null = 1;

  showAddressDialog: boolean = false;
  showNewAddressForm: boolean = false;

  // Form Model for New Address
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

  // --- SHIPPING & PAYMENT OPTIONS ---
  shippingOptions = [
    {
      id: 'express',
      name: 'Giao Hàng Nhanh',
      duration: 'Nhận hàng vào 13 - 14 tháng 4',
      price: 35000,
    },
    {
      id: 'standard',
      name: 'Giao Hàng Tiết Kiệm',
      duration: 'Nhận hàng vào 15 - 17 tháng 4',
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
    {
      id: 'banking',
      name: 'Thanh toán Chuyển khoản',
      icon: 'pi-building-columns',
    },
    { id: 'vnpay', name: 'Thẻ ATM Nội địa / VNPAY', icon: 'pi-credit-card' },
  ];
  selectedPayment: string = 'cod';

  orderNote: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchProvinces();
  }

  // --- API LOGIC FOR OPEN API PROVINCES ---
  fetchProvinces() {
    this.http.get<any[]>('https://provinces.open-api.vn/api/p/').subscribe({
      next: (data) => {
        this.provinces = data;
      },
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
          next: (data) => {
            this.districts = data.districts || [];
          },
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
          next: (data) => {
            this.wards = data.wards || [];
          },
        });
    }
  }

  // --- DIALOG ACTIONS ---
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
    const newId = new Date().getTime();

    this.savedAddresses.push({
      id: newId,
      name: this.newAddress.name,
      phone: this.newAddress.phone,
      address: fullAddress,
      isDefault: false,
    });

    this.selectedAddressId = newId;
    this.showNewAddressForm = false; // back to selection
  }

  // --- HELPER ---
  getSelectedAddress() {
    return this.savedAddresses.find((a) => a.id === this.selectedAddressId);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
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
    console.log('Placing order:', {
      address: this.getSelectedAddress(),
      items: this.cartItems,
      shipping: this.selectedShipping,
      payment: this.selectedPayment,
      note: this.orderNote,
      total: this.totalPayment,
    });
    alert('Đặt hàng thành công!');
  }
}
