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
import { finalize, switchMap, tap } from 'rxjs';
import { AuthFacade } from '../../services/auth.facade';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    ToastModule,
    NgOptimizedImage,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent {
  registerForm: FormGroup;
  submitted = false;
  isSubmitting = false;

  constructor(
    private readonly authFacade: AuthFacade,
    private readonly fb: FormBuilder,
    private readonly messageService: MessageService,
  ) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      acceptedTerms: [false, [Validators.requiredTrue]],
    });
  }

  getControl(
    controlName: 'username' | 'email' | 'password' | 'acceptedTerms',
  ): AbstractControl | null {
    return this.registerForm.get(controlName);
  }

  getUsernameError(): string {
    const control = this.getControl('username');
    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Vui lòng nhập tên đăng nhập.';
    }

    if (control.errors['minlength']) {
      return 'Tên đăng nhập cần tối thiểu 3 ký tự.';
    }

    return 'Tên đăng nhập không hợp lệ.';
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
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Thiếu thông vịn',
        detail:
          'Vui lòng kiểm tra lại thông tin và đồng ý điều khoản trước khi đăng ký.',
      });
      return;
    }

    this.isSubmitting = true;

    const { email, password, username } = this.registerForm.value;

    this.authFacade
      .register({
        email: email.trim(),
        password: password,
        username: username.trim(),
      })
      .pipe(
        tap(() => {
          this.messageService.add({
            severity: 'success',
            summary: 'Đăng ký thành công',
            detail: 'Đang tự động đăng nhập vào hệ thống...',
          });
        }),
        switchMap(() => this.authFacade.login(email.trim(), password)),
        finalize(() => (this.isSubmitting = false)),
      )
      .subscribe({
        next: () => {
          this.authFacade.navigateAfterLogin();
        },
        error: (error: unknown) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Đăng nhập tự động thất bại',
            detail:
              'Đăng ký thành công nhưng đăng nhập bị lỗi. Vui lòng đăng nhập lại.',
          });
        },
      });
  }
}
