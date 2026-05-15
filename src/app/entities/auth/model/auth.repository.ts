import { Injectable } from '@angular/core';

import { Observable, map } from 'rxjs';
import {
  AuthResponse,
  ApiBaseService,
  LoginRequest,
  RegisterRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '../../../shared/api/generated/api-service-base.service';
import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/services/auth-session.service';

@Injectable({ providedIn: 'root' })
export class AuthRepository {
  constructor(
    private readonly api: ApiBaseService,
    private readonly sessionService: AuthSessionService,
  ) {}

  login(email: string, password: string): Observable<AuthResponse> {
    const payload = new LoginRequest({ email, password });

    return this.api.login(payload).pipe(
      map((response) => {
        if (response.success === false || !response.data) {
          throw new Error(response.message ?? 'Dang nhap that bai.');
        }

        return response.data;
      }),
    );
  }

  register(request: {
    email: string;
    password: string;
    username: string;
  }): Observable<AuthResponse> {
    const payload = new RegisterRequest({
      email: request.email,
      password: request.password,
      confirmPassword: request.password,
      userName: request.username,
    });

    return this.api.register(payload).pipe(
      map((response) => {
        if (response.success === false || !response.data) {
          throw new Error(response.message ?? 'Dang ky that bai.');
        }

        return response.data;
      }),
    );
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    const payload = new ForgotPasswordRequest({ email });
    return this.api.forgotPassword(payload).pipe(
      map((res) => ({
        message: res.data ?? res.message ?? 'Email đã được gửi.',
      })),
    );
  }

  resetPassword(
    email: string,
    token: string,
    newPassword: string,
  ): Observable<{ message: string }> {
    const payload = new ResetPasswordRequest({ email, token, newPassword });
    return this.api.resetPassword(payload).pipe(
      map((res) => {
        if (res.success === false) {
          throw new Error(res.message ?? 'Đặt lại mật khẩu thất bại.');
        }
        return {
          message: res.data ?? res.message ?? 'Đổi mật khẩu thành công!',
        };
      }),
    );
  }
  getProfile(): Observable<AuthResponse> {
    return this.api.profileGET().pipe(
      map((res) => {
        if (res.success === false || !res.data) {
          throw new Error(
            res.message ?? 'Không thể lấy thông tin người dùng.',
          );
        }

        const profile = res.data;
        return {
          user: {
            id: profile.id!,
            email: profile.email,
            fullName: profile.fullName,
            roles: profile.roles,
            avatarUrl: profile.avatarUrl,
          },
        } as AuthResponse;
      }),
    );
  }
}
