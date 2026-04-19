import { Component, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SellerRegistrationFormComponent } from '../../../../features/seller-registration/ui/seller-registration-form/seller-registration-form.component';
import { SellerRegistrationService } from '../../../../features/seller-registration/model/seller-registration.service';
import { AuthSessionService } from '../../../../core/services/auth-session.service';
import {
  SellerRegistrationFormValue,
  SellerRegistrationState,
  SellerShopInfo,
} from '../../../../entities/seller/model/seller.model';

@Component({
  selector: 'app-seller-onboarding',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ToastModule,
    SellerRegistrationFormComponent,
  ],
  providers: [MessageService],
  templateUrl: './seller-onboarding.component.html',
  styleUrl: './seller-onboarding.component.scss',
})
export class SellerOnboardingComponent implements OnInit {
  state$!: Observable<SellerRegistrationState>;
  slugError$!: Observable<string | null>;
  shopInfo$!: Observable<SellerShopInfo | null>;

  constructor(
    private readonly sellerService: SellerRegistrationService,
    public readonly authSession: AuthSessionService,
    private readonly router: Router,
    @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {}

  ngOnInit(): void {
    this.state$ = this.sellerService.state$;
    this.slugError$ = this.sellerService.slugError$;
    this.shopInfo$ = this.sellerService.shopInfo$;

    if (isPlatformBrowser(this.platformId)) {
      // Nếu đã là Seller → redirect thẳng vào dashboard
      if (this.authSession.isSeller()) {
        this.router.navigateByUrl('/seller/dashboard');
        return;
      }
      this.sellerService.initState();
    }
  }

  onFormSubmit(value: SellerRegistrationFormValue): void {
    this.sellerService.submitRegistration(value).subscribe();
  }

  onNameChange(_name: string): void {}

  onResetToIdle(): void {
    this.sellerService.resetToIdle();
  }

  checkSlugAvailable = (slug: string): Observable<boolean> => {
    return this.sellerService.checkSlugAvailable(slug);
  };
}
