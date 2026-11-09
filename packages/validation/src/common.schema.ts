import { z } from 'zod';

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc', 'ASC', 'DESC']).default('desc'),
  search: z.string().trim().max(100).optional(),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid({ message: 'Must be a valid UUID' }),
});

export const slugSchema = z
  .string()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must contain only lowercase alphanumeric characters and hyphens',
  });

export const phoneNumberSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      // Pakistani format: +923001234567, 03001234567 or standard E.164
      const pkRegex = /^(?:\+92|0092|0)?(3[0-9]{9})$/;
      const e164Regex = /^\+[1-9]\d{1,14}$/;
      return pkRegex.test(val) || e164Regex.test(val);
    },
    {
      message: 'Invalid phone number. Provide valid Pakistani (e.g. 03001234567) or international format (+92...)',
    },
  );

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
