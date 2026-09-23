/**
 * Seed demo org, users, products, shops, and orders (Admin SDK).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./serviceAccount.json \
 *   SEED_DISTRIBUTOR_UID=... SEED_SR_UID=... \
 *   npx ts-node scripts/seed.ts
 *
 * 1. Create Auth users in Firebase Console (email/password).
 * 2. Copy their UIDs into SEED_DISTRIBUTOR_UID / SEED_SR_UID.
 * 3. Run this script.
 *
 * Product / shop / order docs use stable IDs so re-runs overwrite dummy
 * data instead of duplicating it. Non-seed documents are left alone.
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

const distributorUid = process.env.SEED_DISTRIBUTOR_UID ?? 'iSNNj7muIURV1kjIbpcWlXW6j163';
const srUid = process.env.SEED_SR_UID ?? 'aAy2xEOkHQfxrmhJjqxwNnYlWiR2';
const distributorId = process.env.SEED_DISTRIBUTOR_ID ?? 'dealer-1';
const distributorName = 'Demo Distributor';
const srName = 'Sales Rep';

type AdjustmentMode = 'discountAmount' | 'freePcs';

type SeedProduct = {
  id: string;
  name: string;
  pricePerCase: number;
  active: boolean;
};

type SeedShop = {
  id: string;
  name: string;
  phone: string;
  address: string;
  area: string;
  ownerName: string;
};

type SeedLineInput = {
  productId: string;
  quantityCases: number;
  quantityPcs: number;
  adjustmentMode: AdjustmentMode;
  adjustmentValue: number;
};

type SeedOrder = {
  id: string;
  shopId: string;
  memoNo?: string;
  daysAgo: number;
  deliveryOffsetDays: number;
  status: 'draft' | 'submitted' | 'confirmed' | 'cancelled';
  lines: SeedLineInput[];
};

const products: SeedProduct[] = [
  { id: 'prod-soybean-oil', name: 'Soybean Oil 5L', pricePerCase: 2400, active: true },
  { id: 'prod-palm-oil', name: 'Palm Oil 5L', pricePerCase: 1850, active: true },
  { id: 'prod-atta', name: 'Atta 25kg', pricePerCase: 1650, active: true },
  { id: 'prod-sugar', name: 'Sugar 50kg', pricePerCase: 3200, active: true },
  { id: 'prod-tea', name: 'Premium Tea 20kg', pricePerCase: 4100, active: true },
  { id: 'prod-biscuit', name: 'Marie Biscuit Carton', pricePerCase: 980, active: true },
  { id: 'prod-lentil-old', name: 'Lentil 20kg (discontinued)', pricePerCase: 2200, active: false },
];

const shops: SeedShop[] = [
  {
    id: 'shop-rahman-store',
    name: 'Rahman Store',
    phone: '01711001001',
    address: '12/A Dilkusha',
    area: 'Motijheel',
    ownerName: 'Abdur Rahman',
  },
  {
    id: 'shop-fatema-traders',
    name: 'Fatema Traders',
    phone: '01812002002',
    address: '45 Road 7A',
    area: 'Dhanmondi',
    ownerName: 'Fatema Begum',
  },
  {
    id: 'shop-karim-bazar',
    name: 'Karim Bazar',
    phone: '01913003003',
    address: '88 Gulshan Avenue',
    area: 'Gulshan',
    ownerName: 'Karim Uddin',
  },
  {
    id: 'shop-nabila-mart',
    name: 'Nabila Mart',
    phone: '01614004004',
    address: 'Sector 7, House 22',
    area: 'Uttara',
    ownerName: 'Nabila Akter',
  },
  {
    id: 'shop-hasan-general',
    name: 'Hasan General Store',
    phone: '01515005005',
    address: 'Mirpur 10, Block C',
    area: 'Mirpur',
    ownerName: 'Hasan Ali',
  },
  {
    id: 'shop-alamin-corner',
    name: 'Alamin Corner',
    phone: '01316006006',
    address: 'New Market Gate 2',
    area: 'New Market',
    ownerName: 'Alamin Hossain',
  },
];

const orders: SeedOrder[] = [
  {
    id: 'order-rahman-confirmed',
    shopId: 'shop-rahman-store',
    memoNo: 'M-1001',
    daysAgo: 12,
    deliveryOffsetDays: 2,
    status: 'confirmed',
    lines: [
      { productId: 'prod-soybean-oil', quantityCases: 8, quantityPcs: 0, adjustmentMode: 'discountAmount', adjustmentValue: 400 },
      { productId: 'prod-atta', quantityCases: 4, quantityPcs: 2, adjustmentMode: 'freePcs', adjustmentValue: 4 },
    ],
  },
  {
    id: 'order-fatema-submitted',
    shopId: 'shop-fatema-traders',
    memoNo: 'M-1002',
    daysAgo: 8,
    deliveryOffsetDays: 3,
    status: 'submitted',
    lines: [
      { productId: 'prod-sugar', quantityCases: 3, quantityPcs: 0, adjustmentMode: 'discountAmount', adjustmentValue: 200 },
      { productId: 'prod-tea', quantityCases: 2, quantityPcs: 0, adjustmentMode: 'discountAmount', adjustmentValue: 0 },
      { productId: 'prod-biscuit', quantityCases: 6, quantityPcs: 4, adjustmentMode: 'freePcs', adjustmentValue: 6 },
    ],
  },
  {
    id: 'order-karim-draft',
    shopId: 'shop-karim-bazar',
    daysAgo: 1,
    deliveryOffsetDays: 2,
    status: 'draft',
    lines: [
      { productId: 'prod-palm-oil', quantityCases: 5, quantityPcs: 0, adjustmentMode: 'discountAmount', adjustmentValue: 150 },
    ],
  },
  {
    id: 'order-nabila-cancelled',
    shopId: 'shop-nabila-mart',
    memoNo: 'M-1003',
    daysAgo: 10,
    deliveryOffsetDays: 1,
    status: 'cancelled',
    lines: [
      { productId: 'prod-tea', quantityCases: 1, quantityPcs: 0, adjustmentMode: 'discountAmount', adjustmentValue: 0 },
      { productId: 'prod-biscuit', quantityCases: 2, quantityPcs: 0, adjustmentMode: 'freePcs', adjustmentValue: 2 },
    ],
  },
  {
    id: 'order-hasan-confirmed',
    shopId: 'shop-hasan-general',
    memoNo: 'M-1004',
    daysAgo: 6,
    deliveryOffsetDays: 2,
    status: 'confirmed',
    lines: [
      { productId: 'prod-soybean-oil', quantityCases: 3, quantityPcs: 1, adjustmentMode: 'freePcs', adjustmentValue: 2 },
      { productId: 'prod-palm-oil', quantityCases: 4, quantityPcs: 0, adjustmentMode: 'discountAmount', adjustmentValue: 250 },
      { productId: 'prod-sugar', quantityCases: 2, quantityPcs: 0, adjustmentMode: 'discountAmount', adjustmentValue: 0 },
    ],
  },
  {
    id: 'order-alamin-submitted',
    shopId: 'shop-alamin-corner',
    memoNo: 'M-1005',
    daysAgo: 3,
    deliveryOffsetDays: 1,
    status: 'submitted',
    lines: [
      { productId: 'prod-atta', quantityCases: 6, quantityPcs: 0, adjustmentMode: 'discountAmount', adjustmentValue: 300 },
    ],
  },
  {
    id: 'order-rahman-submitted',
    shopId: 'shop-rahman-store',
    memoNo: 'M-1006',
    daysAgo: 2,
    deliveryOffsetDays: 3,
    status: 'submitted',
    lines: [
      { productId: 'prod-biscuit', quantityCases: 10, quantityPcs: 0, adjustmentMode: 'freePcs', adjustmentValue: 12 },
      { productId: 'prod-tea', quantityCases: 1, quantityPcs: 3, adjustmentMode: 'discountAmount', adjustmentValue: 100 },
    ],
  },
  {
    id: 'order-fatema-confirmed',
    shopId: 'shop-fatema-traders',
    memoNo: 'M-1007',
    daysAgo: 14,
    deliveryOffsetDays: 2,
    status: 'confirmed',
    lines: [
      { productId: 'prod-palm-oil', quantityCases: 7, quantityPcs: 0, adjustmentMode: 'discountAmount', adjustmentValue: 0 },
      { productId: 'prod-atta', quantityCases: 2, quantityPcs: 1, adjustmentMode: 'freePcs', adjustmentValue: 1 },
    ],
  },
  {
    id: 'order-karim-submitted',
    shopId: 'shop-karim-bazar',
    memoNo: 'M-1008',
    daysAgo: 5,
    deliveryOffsetDays: 4,
    status: 'submitted',
    lines: [
      { productId: 'prod-soybean-oil', quantityCases: 2, quantityPcs: 0, adjustmentMode: 'discountAmount', adjustmentValue: 0 },
      { productId: 'prod-sugar', quantityCases: 1, quantityPcs: 0, adjustmentMode: 'discountAmount', adjustmentValue: 50 },
      { productId: 'prod-tea', quantityCases: 3, quantityPcs: 0, adjustmentMode: 'freePcs', adjustmentValue: 3 },
    ],
  },
  {
    id: 'order-nabila-draft',
    shopId: 'shop-nabila-mart',
    daysAgo: 0,
    deliveryOffsetDays: 2,
    status: 'draft',
    lines: [
      { productId: 'prod-biscuit', quantityCases: 4, quantityPcs: 2, adjustmentMode: 'discountAmount', adjustmentValue: 80 },
    ],
  },
];

function normalizeShopName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function computeLineTotal(input: {
  pricePerCase: number;
  quantityCases: number;
  adjustmentMode: AdjustmentMode;
  adjustmentValue: number;
}): number {
  const discount = input.adjustmentMode === 'discountAmount' ? Math.max(0, input.adjustmentValue) : 0;
  return Math.max(0, input.pricePerCase * input.quantityCases - discount);
}

function productById(id: string): SeedProduct {
  const product = products.find((item) => item.id === id);
  if (!product) {
    throw new Error(`Unknown seed product: ${id}`);
  }
  return product;
}

function shopById(id: string): SeedShop {
  const shop = shops.find((item) => item.id === id);
  if (!shop) {
    throw new Error(`Unknown seed shop: ${id}`);
  }
  return shop;
}

function buildLines(inputs: SeedLineInput[]) {
  return inputs.map((line) => {
    const product = productById(line.productId);
    const adjustmentMode = line.adjustmentMode;
    return {
      productId: product.id,
      productName: product.name,
      pricePerCase: product.pricePerCase,
      quantityCases: line.quantityCases,
      quantityPcs: line.quantityPcs,
      adjustmentMode,
      discountAmount: adjustmentMode === 'discountAmount' ? line.adjustmentValue : 0,
      freePcs: adjustmentMode === 'freePcs' ? line.adjustmentValue : 0,
      lineTotal: computeLineTotal({
        pricePerCase: product.pricePerCase,
        quantityCases: line.quantityCases,
        adjustmentMode,
        adjustmentValue: line.adjustmentValue,
      }),
    };
  });
}

async function main() {
  if (!getApps().length) {
    initializeApp();
  }
  const db = getFirestore();
  const now = Timestamp.now();
  const today = startOfDay(new Date());
  const batch = db.batch();

  batch.set(db.collection('distributors').doc(distributorId), {
    name: distributorName,
    active: true,
    createdAt: now,
  });

  batch.set(db.collection('users').doc(distributorUid), {
    name: 'Distributor Admin',
    email: 'distributor@example.com',
    role: 'distributor',
    distributorId,
    active: true,
    createdAt: now,
  });

  batch.set(db.collection('users').doc(srUid), {
    name: srName,
    email: 'sr@example.com',
    role: 'sr',
    distributorId,
    active: true,
    createdAt: now,
  });

  for (const product of products) {
    batch.set(db.collection('products').doc(product.id), {
      distributorId,
      name: product.name,
      pricePerCase: product.pricePerCase,
      active: product.active,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const shop of shops) {
    batch.set(db.collection('shops').doc(shop.id), {
      distributorId,
      name: shop.name,
      nameNormalized: normalizeShopName(shop.name),
      phone: shop.phone,
      address: shop.address,
      area: shop.area,
      ownerName: shop.ownerName,
      createdBy: srUid,
      createdAt: now,
      updatedAt: now,
    });
  }

  for (const order of orders) {
    const shop = shopById(order.shopId);
    const lines = buildLines(order.lines);
    const orderTotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const orderDate = addDays(today, -order.daysAgo);
    const deliveryDate = addDays(orderDate, order.deliveryOffsetDays);

    batch.set(db.collection('orders').doc(order.id), {
      distributorId,
      distributorName,
      srId: srUid,
      srName,
      shopId: shop.id,
      shopName: shop.name,
      ...(order.memoNo ? { memoNo: order.memoNo } : {}),
      orderDate: Timestamp.fromDate(orderDate),
      deliveryDate: Timestamp.fromDate(deliveryDate),
      lines,
      orderTotal,
      status: order.status,
      createdAt: Timestamp.fromDate(orderDate),
      updatedAt: now,
    });
  }

  await batch.commit();

  console.log('Seeded distributor org, users, products, shops, and orders.');
  console.log({
    distributorId,
    distributorUid,
    srUid,
    products: products.length,
    shops: shops.length,
    orders: orders.length,
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
