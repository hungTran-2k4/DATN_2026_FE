import { CommonModule } from '@angular/common';
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
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      acceptedTerms: [false, [Validators.requiredTrue]],
    });
  }

  getControl(
    controlName: 'fullName' | 'email' | 'password' | 'acceptedTerms',
  ): AbstractControl | null {
    return this.registerForm.get(controlName);
  }

  getFullNameError(): string {
    const control = this.getControl('fullName');
    if (!control?.errors) {
      return '';
    }

    if (control.errors['required']) {
      return 'Vui lòng nhập họ tên.';
    }

    if (control.errors['minlength']) {
      return 'Họ tên cần tối thiểu 3 ký tự.';
    }

    return 'Họ tên không hợp lệ.';
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
      return 'Mật khẩu cần tối thiểu 6 ký tự.';
    }

    return 'Mật khẩu không hợp lệ.';
  }

  onSubmit(): void {
    this.submitted = true;
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Thiếu thông tin',
        detail:
          'Vui lòng kiểm tra lại thông tin và đồng ý điều khoản trước khi đăng ký.',
      });
      return;
    }

    this.isSubmitting = true;

    const { email, password, fullName } = this.registerForm.value;

    this.authFacade
      .register({
        email: email.trim(),
        password: password,
        fullName: fullName.trim(),
      })
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Đăng ký thành công',
            detail: 'Đang chuyển vào hệ thống quản trị.',
          });
          this.authFacade.navigateAfterLogin();
        },
        error: (error: unknown) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Đăng ký thất bại',
            detail:
              error instanceof Error
                ? error.message
                : 'Đăng ký thất bại, vui lòng thử lại.',
          });
        },
      });
  }
}
