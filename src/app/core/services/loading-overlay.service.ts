import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingOverlayService {
  private pendingRequestCount = 0;
  private readonly loadingSubject = new BehaviorSubject<boolean>(false);

  get isLoading$(): Observable<boolean> {
    return this.loadingSubject.asObservable();
  }

  show(): void {
    this.pendingRequestCount += 1;
    if (this.pendingRequestCount === 1) {
      // Dùng queueMicrotask để tránh NG0100 (ExpressionChangedAfterItHasBeenCheckedError)
      // khi interceptor gọi show() trong quá trình Angular đang chạy change detection
      queueMicrotask(() => this.loadingSubject.next(true));
    }
  }

  hide(): void {
    if (this.pendingRequestCount > 0) {
      this.pendingRequestCount -= 1;
    }

    if (this.pendingRequestCount === 0) {
      queueMicrotask(() => this.loadingSubject.next(false));
    }
  }
}
