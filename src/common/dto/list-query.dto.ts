// src/common/dto/list-query.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListQuery {
    /** شمارهٔ صفحه (۱‑Base) */
    @ApiProperty({
        description: 'Page number for pagination',
        required: false,
        default: 1,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;
  
    /** تعداد رکورد در هر صفحه */
    @ApiProperty({
        description: 'Number of items per page',
        required: false,
        default: 10,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number = 10;
  
    /** عبارت جستجو روی فیلدهای مشخص‌شده در paginateQuery */
    search?: string;
  
    /** مرتب‌سازی مثل:  -createdAt  یا  name  */
    sort?: string;
  
    
    raw?: 'true' | 'false';
    filters?: Record<string, any>;
  }
  