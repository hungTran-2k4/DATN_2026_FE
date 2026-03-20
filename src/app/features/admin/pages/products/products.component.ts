import { AsyncPipe, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { TableModule } from 'primeng/table';
import {
  GetProductsQuery,
  ProductDto,
} from '../../../../data-access/api/api-service-base.service';
import { AdminProductsFacade } from '../../services/admin-products.facade';

@Component({
  selector: 'app-admin-products-page',
  standalone: true,
  imports: [CommonModule, AsyncPipe, TableModule],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss',
})
export class AdminProductsPageComponent {
  private readonly defaultQuery = new GetProductsQuery({
    page: 1,
    pageSize: 10,
  });

  readonly products$: Observable<ProductDto[]>;

  constructor(private readonly productsFacade: AdminProductsFacade) {
    this.products$ = this.productsFacade.getProducts(this.defaultQuery);
  }
}
