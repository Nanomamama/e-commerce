export type UserRole = "customer" | "admin";
export type UserStatus = "active" | "disabled";

export type User = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
};

export type UserWithPassword = User & {
  passwordHash: string;
};

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  name: string;
  phone?: string;
  role?: UserRole;
};

export type UpdateUserProfileInput = {
  name?: string;
  phone?: string | null;
};

export type ListUsersFilter = {
  query?: string;
  role?: UserRole;
  status?: UserStatus;
  limit?: number;
};

export type AddressType = "shipping" | "billing";

export type Address = {
  id: string;
  userId: string;
  type: AddressType;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  subdistrict: string | null;
  district: string;
  province: string;
  postalCode: string;
  countryCode: string;
  taxId: string | null;
  companyName: string | null;
  branchName: string | null;
  isDefault: boolean;
};

export type AddressInput = {
  type: AddressType;
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  subdistrict?: string | null;
  district: string;
  province: string;
  postalCode: string;
  countryCode?: string;
  taxId?: string | null;
  companyName?: string | null;
  branchName?: string | null;
  isDefault?: boolean;
};

export type UpdateAddressInput = Partial<AddressInput>;
