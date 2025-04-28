import { Model } from 'mongoose';
import { ListQuery } from '../dto/list-query.dto';

interface PaginateOptions<T> {
  coachId?: string;
  role?: string;
  searchFields?: string[];
  filters?: Record<string, any>;
  populate?: string | { path: string; select?: string };
}

export async function paginateQuery<T>(
  model: Model<T>,
  query: Partial<ListQuery> = {},
  opts: PaginateOptions<T> = {},
) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 5);
  const skip = (page - 1) * limit;
  const search = query.search?.toString().trim();
  const where: Record<string, any> = {};

  if (opts.coachId) where.coachId = opts.coachId;
  if (opts.role) where.role = opts.role;

  // فیلترهای دلخواه
  if (opts.filters) {
    for (const key in opts.filters) {
      if (opts.filters[key]) {
        where[key] = opts.filters[key];
      }
    }
  }

  // جستجو
  if (search && opts.searchFields?.length) {
    where.$or = opts.searchFields.map((field) => ({
      [field]: { $regex: search, $options: 'i' },
    }));
  }

  const queryExec = model.find(where);

  if (opts.populate) {
    queryExec.populate(opts.populate as any);
  }

  queryExec.skip(skip).limit(limit).sort({ createdAt: -1 });

  const [items, total] = await Promise.all([
    queryExec.exec(),
    model.countDocuments(where),
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
