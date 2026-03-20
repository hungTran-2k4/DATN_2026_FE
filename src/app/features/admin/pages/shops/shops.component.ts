import { AsyncPipe, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ShopDto } from '../../../../data-access/api/api-service-base.service';
import { AdminShopsFacade } from '../../services/admin-shops.facade';

@Component({
  selector: 'app-admin-shops-page',
  standalone: true,
  imports: [CommonModule, AsyncPipe, TableModule, TagModule],
  templateUrl: './shops.component.html',
  styleUrl: './shops.component.scss',
})
export class AdminShopsPageComponent {
  readonly shops$: Observable<ShopDto[]>;

  constructor(private readonly shopsFacade: AdminShopsFacade) {
    this.shops$ = this.shopsFacade.getShops();
  }
}
