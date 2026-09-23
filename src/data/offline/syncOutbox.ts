import { createShop } from '@/src/data/repos/shopsRepo';
import { pushOrderToServer, pushOrderUpdateToServer } from '@/src/data/repos/ordersRepo';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/src/data/firebase';
import { getOutbox, isLocalId, replaceOutbox, type OutboxItem } from './outbox';
import { isOfflineError } from './isOfflineError';

let flushing = false;

function shopInputFromPayload(
  shop: Extract<OutboxItem, { kind: 'createOrder' }>['payload']['shop'],
  shopIdMap: Map<string, { shopId: string; shopName: string }>,
) {
  if ('shopId' in shop) return { shopId: shop.shopId };
  if ('localShopId' in shop) {
    const mapped = shopIdMap.get(shop.localShopId);
    if (mapped) return { shopId: mapped.shopId };
    return { shopName: shop.shopName };
  }
  return shop;
}

export async function flushOutbox(): Promise<void> {
  if (flushing) return;
  flushing = true;
  try {
    const items = await getOutbox();
    if (!items.length) return;

    const remaining: OutboxItem[] = [];
    const shopIdMap = new Map<string, { shopId: string; shopName: string }>();

    for (const item of items) {
      try {
        if (item.kind === 'createShop') {
          const shopId = await createShop(item.payload);
          shopIdMap.set(item.localId, { shopId, shopName: item.payload.name });
          continue;
        }
        if (item.kind === 'createOrder') {
          await pushOrderToServer({
            distributorId: item.payload.distributorId,
            distributorName: item.payload.distributorName,
            srId: item.payload.srId,
            srName: item.payload.srName,
            createdBy: item.payload.createdBy,
            shop: shopInputFromPayload(item.payload.shop, shopIdMap),
            orderDate: new Date(item.payload.orderDate),
            deliveryDate: new Date(item.payload.deliveryDate),
            lines: item.payload.lines,
            status: item.payload.status,
          });
          continue;
        }
        if (item.kind === 'updateOrder') {
          if (isLocalId(item.orderId)) {
            remaining.push(item);
            continue;
          }
          await pushOrderUpdateToServer({
            id: item.orderId,
            distributorId: item.payload.distributorId,
            createdBy: item.payload.createdBy,
            shop: shopInputFromPayload(item.payload.shop, shopIdMap),
            orderDate: new Date(item.payload.orderDate),
            deliveryDate: new Date(item.payload.deliveryDate),
            lines: item.payload.lines,
            status: item.payload.status,
          });
          continue;
        }
        if (item.kind === 'deleteDraft') {
          if (isLocalId(item.orderId)) continue;
          await deleteDoc(doc(db, 'orders', item.orderId));
        }
      } catch (error) {
        if (isOfflineError(error)) {
          remaining.push(item);
          remaining.push(...items.slice(items.indexOf(item) + 1));
          break;
        }
        remaining.push(item);
      }
    }

    await replaceOutbox(remaining);
  } finally {
    flushing = false;
  }
}
