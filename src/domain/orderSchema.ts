import { z } from 'zod';

const nonNegNumber = z.number({ error: 'Must be a number' }).finite().min(0);

export const orderLineInputSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantityCases: nonNegNumber.gt(0, 'Cases must be greater than 0'),
  quantityPcs: nonNegNumber,
  adjustmentMode: z.enum(['discountAmount', 'freePcs']),
  adjustmentValue: nonNegNumber,
});

export const orderFormSchema = z
  .object({
    shopId: z.string().optional(),
    shopName: z.string().optional(),
    ownerName: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    orderDate: z.date({ error: 'Order date is required' }),
    deliveryDate: z.date({ error: 'Delivery date is required' }),
    lines: z.array(orderLineInputSchema).min(1, 'Add at least one product'),
  })
  .refine((data) => Boolean(data.shopId?.trim() || data.shopName?.trim()), {
    message: 'Shop is required',
    path: ['shopId'],
  })
  .refine((data) => data.deliveryDate.getTime() >= startOfDay(data.orderDate).getTime(), {
    message: 'Delivery date cannot be before order date',
    path: ['deliveryDate'],
  })
  .refine(
    (data) => {
      const ids = data.lines.map((line) => line.productId).filter(Boolean);
      return new Set(ids).size === ids.length;
    },
    {
      message: 'Duplicate products are not allowed',
      path: ['lines'],
    },
  );

export type OrderLineInput = z.infer<typeof orderLineInputSchema>;
export type OrderFormInput = z.infer<typeof orderFormSchema>;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
