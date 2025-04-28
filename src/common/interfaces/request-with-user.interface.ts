import { Request } from 'express'
export interface RequestWithUser extends Request {
  user: {
    userId: string
    role: string
    iat?: number
    exp?: number
  }
}
