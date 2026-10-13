import type { ReaderLevel } from '@/shared/api/enums';
import { apiRequest } from '@/shared/api/http';

/** API guide §7. All return 204; login lives in session.ts. */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  acceptsMarketingEmails: boolean;
  readingLevel: ReaderLevel | null;
  interestCategoryIds: number[];
}

const BASE = '/api/customers/auth';

export const authApi = {
  /** Always 204, even if the email already has an account (by design). */
  register: (body: RegisterRequest) =>
    apiRequest<undefined>(`${BASE}/register`, { method: 'POST', body }),
  verifyEmail: (token: string) =>
    apiRequest<undefined>(`${BASE}/verify-email`, { method: 'POST', body: { token } }),
  resendVerification: (email: string) =>
    apiRequest<undefined>(`${BASE}/resend-verification`, { method: 'POST', body: { email } }),
  forgotPassword: (email: string) =>
    apiRequest<undefined>(`${BASE}/forgot-password`, { method: 'POST', body: { email } }),
  resetPassword: (token: string, newPassword: string) =>
    apiRequest<undefined>(`${BASE}/reset-password`, {
      method: 'POST',
      body: { token, newPassword },
    }),
};
