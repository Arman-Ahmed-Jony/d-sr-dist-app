export type UserRole = 'sr' | 'distributor';

export type OrderStatus = 'draft' | 'submitted' | 'confirmed' | 'cancelled';

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
  lineTotal: number;
}

export interface Order {
  id: string;
  distributorId: string;
  srId: string;
  shopId: string;
  shopName: string;
  lines: OrderLine[];
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}
