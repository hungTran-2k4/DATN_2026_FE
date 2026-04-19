export interface SellerRegistrationFormValue {
  name: string;
  slug: string;
  description: string;
  // Address fields — map trực tiếp vào DB columns
  provinceId?: number;
  districtId?: number;
  wardId?: number;
  pickupAddress?: string; // Chỉ số nhà + tên đường
}

export interface SellerShopInfo {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  coverUrl?: string;
  pickupAddress?: string;
  approvalStatus: number; // 1=Pending, 2=Approved, 3=Rejected, 4=Suspended
  isActive?: boolean;
  createdAt?: Date;
}

export type SellerRegistrationState = 'idle' | 'loading' | 'pending' | 'approved' | 'rejected';

export const ShopApprovalStatus = {
  Pending: 1,
  Approved: 2,
  Rejected: 3,
  Suspended: 4,
} as const;
