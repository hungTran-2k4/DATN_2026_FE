import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-admin-finance',
  standalone: true,
  imports: [CommonModule, TableModule, TagModule, ButtonModule, InputTextModule, FormsModule],
  templateUrl: './admin-finance.component.html',
})
export class AdminFinanceComponent implements OnInit {
  transactions: any[] = [];
  totalRecords: number = 0;
  loading: boolean = true;
  keyword: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadTransactions({ first: 0, rows: 20 });
  }

  loadTransactions(event: any) {
    this.loading = true;
    const page = event.first / event.rows + 1;
    const pageSize = event.rows;
    let url = `${environment.apiUrl}/api/Transactions?page=${page}&pageSize=${pageSize}`;
    if (this.keyword) {
      url += `&keyword=${encodeURIComponent(this.keyword)}`;
    }

    this.http.get<any>(url, { withCredentials: true }).subscribe({
      next: (res) => {
        if (res.success) {
          this.transactions = res.data;
          this.totalRecords = res.totalRecords;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  onSearch() {
    this.loadTransactions({ first: 0, rows: 20 });
  }

  getSeverity(status: string) {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'paid':
        return 'success';
      case 'pending':
        return 'warn';
      case 'failed':
      case 'cancelled':
        return 'danger';
      default:
        return 'info';
    }
  }

  formatPrice(price: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }
}
