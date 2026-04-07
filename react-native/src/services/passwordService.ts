import { ApiClient } from '../config/api';

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

export class PasswordService {
  private static instance: PasswordService;
  private apiClient: ApiClient;

  private constructor() {
    this.apiClient = ApiClient.getInstance();
  }

  public static getInstance(): PasswordService {
    if (!PasswordService.instance) {
      PasswordService.instance = new PasswordService();
    }
    return PasswordService.instance;
  }

  /**
   * Validate password strength and requirements
   */
  public validatePassword(password: string): PasswordValidation {
    const errors: string[] = [];

    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate password confirmation
   */
  public validatePasswordConfirmation(password: string, confirmPassword: string): boolean {
    return password === confirmPassword;
  }

  /**
   * Change user password
   */
  public async changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    try {
      // Validate new password
      const passwordValidation = this.validatePassword(data.newPassword);
      if (!passwordValidation.isValid) {
        return {
          success: false,
          message: passwordValidation.errors.join(', ')
        };
      }

      // Validate password confirmation
      if (!this.validatePasswordConfirmation(data.newPassword, data.confirmPassword)) {
        return {
          success: false,
          message: 'New password and confirmation do not match'
        };
      }

      // Validate current password is provided
      if (!data.currentPassword) {
        return {
          success: false,
          message: 'Current password is required'
        };
      }

      console.log('Attempting to change password...');
      const response = await this.apiClient.put<ChangePasswordResponse>('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });

      return response;
    } catch (error) {
      console.error('Password change failed:', error);
      throw error;
    }
  }

  /**
   * Check if current password is correct
   */
  public async verifyCurrentPassword(currentPassword: string): Promise<boolean> {
    try {
      const response = await this.apiClient.post<{ success: boolean; message: string }>('/auth/verify-password', {
        password: currentPassword
      });
      return response.success;
    } catch (error) {
      console.error('Password verification failed:', error);
      return false;
    }
  }
}

export default PasswordService;
