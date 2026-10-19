export type UserRole = 'sr' | 'distributor' | 'dsr';

export type OrderStatus =
  | 'draft'
  | 'submitted'
  | 'confirmed'
  | 'cancelled'
  | 'delivered'
  | 'bounced'
  | 'partial';

export type LineAdjustmentMode = 'discountAmount' | 'freePcs';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  distributorId: string;
  active: boolean;
  createdAt: Date;
}

export interface Distributor {
  id: string;
  name: string;
  active: boolean;
  createdAt: Date;
}

export interface Product {
  id: string;
  distributorId: string;
  name: string;
  pricePerCase: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Shop {
  id: string;
  distributorId: string;
  name: string;
  nameNormalized: string;
  phone: string;
  address: string;
  area: string;
  ownerName: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderLine {
  productId: string;
  productName: string;
  pricePerCase: number;
  quantityCases: number;
  quantityPcs: number;
  adjustmentMode: LineAdjustmentMode;
  discountAmount: number;
  freePcs: number;
  freeProductId: string;
  freeProductName: string;
  lineTotal: number;
  bouncedCases: number;
  bouncedPcs: number;
}

export interface Order {
  id: string;
  distributorId: string;
  distributorName?: string;
  srId: string;
  srName?: string;
  dsrId?: string;
  dsrName?: string;
  shopId: string;
  shopName: string;
  memoNo?: string;
  orderDate: Date;
  deliveryDate: Date;
  status: OrderStatus;
  lines: OrderLine[];
  orderTotal: number;
  createdAt: Date;
  updatedAt: Date;
  pendingSync?: boolean;
}
