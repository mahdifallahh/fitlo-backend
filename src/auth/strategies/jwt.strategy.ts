import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: 'supersecretkey', // از .env بگیر بعداً
    });
  }

  async validate(payload: { userId: string; role: string }) {
    console.log(payload);
    
    return { userId: payload.userId, role: payload.role };
  }
}
