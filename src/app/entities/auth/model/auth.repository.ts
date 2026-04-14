import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  AuthResponse,
  ApiBaseService,
  LoginRequest,
  RegisterRequest,
} from '../../../shared/api/generated/api-service-base.service';
import { environment } from '../../../../environments/environment';
import { AuthSessionService } from '../../../core/services/auth-session.service';

@Injectable({ providedIn: 'root' })
export class AuthRepository {
  constructor(
    private readonly api: ApiBaseService,
    private readonly http: HttpClient,
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
    return this.http
      .post<{
        success: boolean;
        data: string;
        message: string;
      }>(
        `${environment.apiUrl}/api/Auth/forgot-password`,
        { email },
        { withCredentials: true },
      )
      .pipe(
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
    return this.http
      .post<{
        success: boolean;
        data: string;
        message: string;
        errorCode?: string;
      }>(
        `${environment.apiUrl}/api/Auth/reset-password`,
        { email, token, newPassword },
        { withCredentials: true },
      )
      .pipe(
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
    return this.http
      .get<{
        success: boolean;
        data: any;
        message: string;
      }>(`${environment.apiUrl}/api/me/profile`, { withCredentials: true })
      .pipe(
        map((res) => {
          if (res.success === false || !res.data) {
            throw new Error(
              res.message ?? 'Không thể lấy thông tin người dùng.',
            );
          }

          // Map to AuthResponse structure expected by sessionService.saveSession
          const profile = res.data;
          return {
            user: {
              id: profile.userId || profile.id,
              email: profile.email,
              fullName: profile.fullName,
              roles: profile.roles,
            },
          } as AuthResponse;
        }),
      );
  }
}
