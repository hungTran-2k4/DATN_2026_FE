import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { finalize } from 'rxjs';
import { AuthRepository } from '../../../../entities/auth/model/auth.repository';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    InputTextModule,
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss',
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  token = '';
  email = '';
  passwordStrength = 0;
  passwordStrengthLabel = '';

  constructor(
    private readonly authRepository: AuthRepository,
    private route: ActivatedRoute,
    private fb: FormBuilder,
  ) {
    this.resetForm = this.fb.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(8), this.passwordPolicyValidator]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.token = params['token'] || '';
      this.email = params['email'] || '';

      if (!this.token || !this.email) {
        this.errorMessage =
          'Link đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu link mới.';
      }
    });

    // Watch password changes for strength meter
    this.resetForm.get('newPassword')?.valueChanges.subscribe((val) => {
      this.updatePasswordStrength(val);
    });
  }

  passwordPolicyValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;

    const hasUpper = /[A-Z]/.test(value);
    const hasLower = /[a-z]/.test(value);
    const hasDigit = /\d/.test(value);
    const hasSpecial = /[^a-zA-Z\d]/.test(value);

    if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      return { passwordPolicy: true };
    }
    return null;
  }

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { passwordMismatch: true };
  }

  updatePasswordStrength(password: string): void {
    if (!password) {
      this.passwordStrength = 0;
      this.passwordStrengthLabel = '';
      return;
    }

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;

    this.passwordStrength = Math.min(Math.round((score / 6) * 100), 100);

    if (this.passwordStrength < 40) {
      this.passwordStrengthLabel = 'Yếu';
    } else if (this.passwordStrength < 70) {
      this.passwordStrengthLabel = 'Trung bình';
    } else {
      this.passwordStrengthLabel = 'Mạnh';
    }
  }

  onSubmit(): void {
    if (!this.token || !this.email) {
      this.errorMessage =
        'Link đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu link mới.';
      return;
    }

    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    const { newPassword } = this.resetForm.value;

    this.authRepository
      .resetPassword(this.email, this.token, newPassword)
      .pipe(finalize(() => (this.isSubmitting = false)))
      .subscribe({
        next: (result) => {
          this.successMessage = result.message;
        },
        error: (error: any) => {
          const msg = error?.error?.message || error?.message;
          if (msg?.includes('hết hạn') || msg?.includes('không hợp lệ')) {
            this.errorMessage =
              'Link đặt lại mật khẩu đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu link mới.';
          } else {
            this.errorMessage = msg || 'Đặt lại mật khẩu thất bại.';
          }
        },
      });
  }
}
