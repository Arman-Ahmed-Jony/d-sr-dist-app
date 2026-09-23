import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppUser, Order, Product, Shop } from '@/src/domain/types';

const PREFIX = 'sr-dist.cache.';

function profileKey(uid: string) {
  return `${PREFIX}profile.${uid}`;
}
function shopsKey(distributorId: string) {
  return `${PREFIX}shops.${distributorId}`;
}
function shopByIdKey(id: string) {
  return `${PREFIX}shop.${id}`;
}
function productByIdKey(id: string) {
  return `${PREFIX}product.${id}`;
}
function productsKey(distributorId: string) {
  return `${PREFIX}products.${distributorId}`;
}
function ordersSrKey(srId: string, distributorId: string) {
  return `${PREFIX}orders.sr.${srId}.${distributorId}`;
}
function ordersDistKey(distributorId: string) {
  return `${PREFIX}orders.dist.${distributorId}`;
}
function ordersShopKey(shopId: string, distributorId: string) {
  return `${PREFIX}orders.shop.${shopId}.${distributorId}`;
}

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function serializeUser(user: AppUser) {
  return { ...user, createdAt: user.createdAt.toISOString() };
}

function deserializeUser(raw: ReturnType<typeof serializeUser>): AppUser {
  return { ...raw, createdAt: new Date(raw.createdAt) };
}

function serializeShop(shop: Shop) {
  return {
    ...shop,
    createdAt: shop.createdAt.toISOString(),
    updatedAt: shop.updatedAt.toISOString(),
  };
}

function deserializeShop(raw: ReturnType<typeof serializeShop>): Shop {
  return { ...raw, createdAt: new Date(raw.createdAt), updatedAt: new Date(raw.updatedAt) };
}

function serializeProduct(product: Product) {
  return {
    ...product,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

function deserializeProduct(raw: ReturnType<typeof serializeProduct>): Product {
  return { ...raw, createdAt: new Date(raw.createdAt), updatedAt: new Date(raw.updatedAt) };
}

export function serializeOrder(order: Order) {
  return {
    ...order,
    orderDate: order.orderDate.toISOString(),
    deliveryDate: order.deliveryDate.toISOString(),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export function deserializeOrder(raw: ReturnType<typeof serializeOrder>): Order {
  return {
    ...raw,
    orderDate: new Date(raw.orderDate),
    deliveryDate: new Date(raw.deliveryDate),
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  };
}

export async function saveCachedProfile(user: AppUser): Promise<void> {
  await writeJson(profileKey(user.id), serializeUser(user));
}

export async function loadCachedProfile(uid: string): Promise<AppUser | null> {
  const raw = await readJson<ReturnType<typeof serializeUser>>(profileKey(uid));
  return raw ? deserializeUser(raw) : null;
}

export async function saveCachedShops(distributorId: string, shops: Shop[]): Promise<void> {
  await writeJson(shopsKey(distributorId), shops.map(serializeShop));
  await Promise.all(shops.map(saveCachedShopById));
}

export async function loadCachedShops(distributorId: string): Promise<Shop[] | null> {
  const raw = await readJson<ReturnType<typeof serializeShop>[]>(shopsKey(distributorId));
  return raw ? raw.map(deserializeShop) : null;
}

export async function saveCachedShopById(shop: Shop): Promise<void> {
  await writeJson(shopByIdKey(shop.id), serializeShop(shop));
}

export async function loadCachedShopById(id: string): Promise<Shop | null> {
  const raw = await readJson<ReturnType<typeof serializeShop>>(shopByIdKey(id));
  return raw ? deserializeShop(raw) : null;
}

export async function upsertCachedShop(shop: Shop): Promise<void> {
  await saveCachedShopById(shop);
  const current = (await loadCachedShops(shop.distributorId)) ?? [];
  const next = [shop, ...current.filter((row) => row.id !== shop.id)];
  next.sort((a, b) => a.name.localeCompare(b.name));
  await saveCachedShops(shop.distributorId, next);
}

export async function saveCachedProductById(product: Product): Promise<void> {
  await writeJson(productByIdKey(product.id), serializeProduct(product));
}

export async function loadCachedProductById(id: string): Promise<Product | null> {
  const raw = await readJson<ReturnType<typeof serializeProduct>>(productByIdKey(id));
  return raw ? deserializeProduct(raw) : null;
}

export async function saveCachedProducts(distributorId: string, products: Product[]): Promise<void> {
  await writeJson(productsKey(distributorId), products.map(serializeProduct));
  await Promise.all(products.map(saveCachedProductById));
}

export async function loadCachedProducts(distributorId: string): Promise<Product[] | null> {
  const raw = await readJson<ReturnType<typeof serializeProduct>[]>(productsKey(distributorId));
  return raw ? raw.map(deserializeProduct) : null;
}

export async function saveCachedSrOrders(
  srId: string,
  distributorId: string,
  orders: Order[],
): Promise<void> {
  await writeJson(ordersSrKey(srId, distributorId), orders.map(serializeOrder));
}

export async function loadCachedSrOrders(srId: string, distributorId: string): Promise<Order[] | null> {
  const raw = await readJson<ReturnType<typeof serializeOrder>[]>(ordersSrKey(srId, distributorId));
  return raw ? raw.map(deserializeOrder) : null;
}

export async function saveCachedDistributorOrders(distributorId: string, orders: Order[]): Promise<void> {
  await writeJson(ordersDistKey(distributorId), orders.map(serializeOrder));
}

export async function loadCachedDistributorOrders(distributorId: string): Promise<Order[] | null> {
  const raw = await readJson<ReturnType<typeof serializeOrder>[]>(ordersDistKey(distributorId));
  return raw ? raw.map(deserializeOrder) : null;
}

export async function saveCachedShopOrders(
  shopId: string,
  distributorId: string,
  orders: Order[],
): Promise<void> {
  await writeJson(ordersShopKey(shopId, distributorId), orders.map(serializeOrder));
}

export async function loadCachedShopOrders(
  shopId: string,
  distributorId: string,
): Promise<Order[] | null> {
  const raw = await readJson<ReturnType<typeof serializeOrder>[]>(ordersShopKey(shopId, distributorId));
  return raw ? raw.map(deserializeOrder) : null;
}
