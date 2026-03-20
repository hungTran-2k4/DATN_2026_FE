import { AsyncPipe, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import {
  BrandDto,
  CategoryDto,
} from '../../../../data-access/api/api-service-base.service';
import { AdminCatalogFacade } from '../../services/admin-catalog.facade';

@Component({
  selector: 'app-admin-catalog-page',
  standalone: true,
  imports: [CommonModule, AsyncPipe, CardModule, TableModule],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.scss',
})
export class AdminCatalogPageComponent {
  readonly categories$: Observable<CategoryDto[]>;
  readonly brands$: Observable<BrandDto[]>;

  constructor(private readonly catalogFacade: AdminCatalogFacade) {
    this.categories$ = this.catalogFacade.getCategories();
    this.brands$ = this.catalogFacade.getBrands();
  }
}
