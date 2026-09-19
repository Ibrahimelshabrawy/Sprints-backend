import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import type { StringValue } from 'ms';
import { TokenService } from './services/token.service';
import { AuthenticationGuard } from './guards/authentication.guard';
import { AuthorizationGuard } from './guards/authorization.guard';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN as StringValue },
    }),
  ],
  providers: [TokenService, AuthenticationGuard, AuthorizationGuard],
  exports: [TokenService, AuthenticationGuard, AuthorizationGuard, JwtModule],
})
export class CommonModule {}
