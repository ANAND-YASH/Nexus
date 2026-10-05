import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PasswordService } from './password.service';
import { RefreshSession } from './sessions/refresh-session.entity';
import { RefreshSessionsService } from './sessions/refresh-sessions.service';
import { TokenService } from './token.service';

@Module({
  imports: [
    UsersModule,
    TypeOrmModule.forFeature([RefreshSession]),
    // Secrets are passed per call in TokenService (access ≠ refresh secret).
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    RefreshSessionsService,
    // Secure by default: every route needs a token unless marked @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
