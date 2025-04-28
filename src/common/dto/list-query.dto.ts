
// src/common/dto/list-query.dto.ts
export class ListQuery {
    /** شمارهٔ صفحه (۱‑Base) */
    page?: number;
  
    /** تعداد رکورد در هر صفحه */
    limit?: number;
  
    /** عبارت جستجو روی فیلدهای مشخص‌شده در paginateQuery */
    search?: string;
  
    /** مرتب‌سازی مثل:  -createdAt  یا  name  */
    sort?: string;
  
    /** اگر '?raw=true' بدهیم صفحه‌بندی خام برمی‌گردد (به درد دراپ‌دان‌ها) */
    raw?: 'true' | 'false';
    filters?: Record<string, any>;
  }
  