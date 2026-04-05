import { Component, inject } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Observable } from 'rxjs';
import { LoadingOverlayService } from './core/services/loading-overlay.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AsyncPipe, NgIf],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  private readonly loadingOverlay = inject(LoadingOverlayService);
  readonly isGlobalLoading$: Observable<boolean> =
    this.loadingOverlay.isLoading$;
}
