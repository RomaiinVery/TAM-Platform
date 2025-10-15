import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest()
    const hdr = req.headers['x-admin-key']
    if (!hdr || hdr !== process.env.ADMIN_API_KEY) {
      throw new UnauthorizedException('Invalid admin key')
    }
    return true
  }
}
