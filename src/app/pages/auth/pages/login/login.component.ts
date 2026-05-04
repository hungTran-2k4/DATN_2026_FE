import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Component } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { finalize } from 'rxjs';
import { AuthFacade } from '../../services/auth.facade';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    ToastModule,
    NgOptimizedImage
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  loginForm: FormGroup;
  submitted = false;
  isSubmitting = false;
  errorMessage: string | null = null;

  constructor(
    private readonly authFacade: AuthFacade,
    private readonly fb: FormBuilder,
    private readonly messageService: MessageService,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      rememberMe: [false],
    });
  }

  getControl(controlName: 'email' | 'password'): AbstractControl | null {
    return this.loginForm.get(controlName);
  }

  getEmailError(): string {
    const control = this.getControl('email');
    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Vui lòng nhập email.';
    }

    if (control.errors['email']) {
      return 'Email không đúng định dạng.';
    }

    return 'Email không hợp lệ.';
  }

  getPasswordError(): string {
    const control = this.getControl('password');
    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Vui lòng nhập mật khẩu.';
    }

    if (control.errors['minlength']) {
      return 'Mật khẩu cần tối thiểu 8 ký tự.';
    }

    return 'Mật khẩu không hợp lệ.';
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = null;
    
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Thiếu thông tin',
        detail: 'Vui lòng nhập đủ email và mật khẩu.',
      });
      return;
    }

    this.isSubmitting = true;

    const { email, password } = this.loginForm.value;

    this.authFacade
      .login(email.trim(), password)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Thành công',
            detail: 'Đăng nhập thành công. Chào mừng bạn!',
          });

          // Cảnh báo nếu dùng mật khẩu mặc định
          if (password === 'abc@123') {
            setTimeout(() => {
              this.messageService.add({
                severity: 'warn',
                summary: 'Cảnh báo bảo mật',
                sticky: true,
                detail: 'Bạn đang sử dụng mật khẩu mặc định. Vui lòng đổi mật khẩu ngay để bảo mật tài khoản!',
              });
            }, 1000);
          }

          this.authFacade.navigateAfterLogin();
        },
        error: (error: any) => {
          this.errorMessage = error.message;
          this.messageService.add({
            severity: 'error',
            summary: 'Đăng nhập thất bại',
            detail: error.message,
          });
          // Better UX: Clear password and allow user to retype
          this.loginForm.get('password')?.setValue('');
          this.loginForm.get('password')?.markAsUntouched();
        },
      });
  }
}
