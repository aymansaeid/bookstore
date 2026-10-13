import type { ReaderLevel } from '@/shared/api/enums';

/** API guide §7 / §7b customer profile. */
export interface Customer {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  isEmailVerified: boolean;
  acceptsMarketingEmails: boolean;
  createdAtUtc: string;
  readingLevel: ReaderLevel | null;
  monthlyBudget: number | null;
  interestCategoryIds: number[];
}

/** Login and refresh response. The refresh token is an HttpOnly cookie, never in the body. */
export interface CustomerAuthResponse {
  accessToken: string;
  expiresAtUtc: string;
  customer: Customer;
}
