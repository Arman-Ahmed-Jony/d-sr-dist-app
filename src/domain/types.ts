export type UserRole = 'sr' | 'distributor';

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
