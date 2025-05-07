import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  STUDENT = 'student',
  COACH = 'coach',
  ADMIN = 'admin',
}
export enum PremiumStatusEnum {
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  PENDING = 'pending',
}
@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  phone: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: false })
  verified: boolean;

  @Prop({ enum: UserRole, default: UserRole.COACH })
  role: UserRole;

  @Prop({ default: false })
  isPremium: boolean;
  @Prop()
  name: string;

  @Prop()
  bio: string;

  @Prop()
  whatsapp: string;

  @Prop()
  instagram: string;

  @Prop()
  telegram: string;

  @Prop()
  youtube: string;

  @Prop()
  email: string;
  @Prop()
  coachId?: string;
  @Prop()
  receiptUrl?: string;

  @Prop({ enum: PremiumStatusEnum, default: null })
  premiumStatus?: PremiumStatusEnum;

  @Prop()
  premiumAt?: Date;

  @Prop()
  premiumExpiresAt?: Date;

  @Prop()
  profileImage?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
