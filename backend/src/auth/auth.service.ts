import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Email atau password salah');
    }

    const sessionId = randomUUID();

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: user.id, sid: sessionId, type: 'refresh' },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt,
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    };
  }

  async refresh(refreshToken: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const session = await this.prisma.refreshSession.findUnique({
      where: { id: payload.sid },
    });

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.tokenHash !== hashToken(refreshToken)
    ) {
      throw new UnauthorizedException('Refresh token tidak valid');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    const nextAccessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      },
    );
    const nextRefreshToken = await this.jwt.signAsync(
      { sub: user.id, sid: session.id, type: 'refresh' },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    const rotated = await this.prisma.refreshSession.updateMany({
      where: {
        id: session.id,
        tokenHash: hashToken(refreshToken),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        tokenHash: hashToken(nextRefreshToken),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    if (rotated.count !== 1) {
      throw new UnauthorizedException('Refresh token sudah digunakan');
    }

    return {
      access_token: nextAccessToken,
      refresh_token: nextRefreshToken,
    };
  }

  async logout(
    refreshToken: string,
  ): Promise<{ success: true; message: string }> {
    const payload = await this.verifyRefreshToken(refreshToken);
    await this.prisma.refreshSession.updateMany({
      where: {
        id: payload.sid,
        userId: payload.sub,
        tokenHash: hashToken(refreshToken),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    return { success: true, message: 'OK' };
  }

  private async verifyRefreshToken(
    token: string,
  ): Promise<{ sub: string; sid: string; type: 'refresh' }> {
    const secret = this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    try {
      const payload: unknown = await this.jwt.verifyAsync(token, {
        secret,
      });

      if (
        typeof payload === 'object' &&
        payload !== null &&
        'sub' in payload &&
        typeof payload.sub === 'string' &&
        'sid' in payload &&
        typeof payload.sid === 'string' &&
        'type' in payload &&
        payload.type === 'refresh'
      ) {
        return {
          sub: payload.sub,
          sid: payload.sid,
          type: 'refresh',
        };
      }
    } catch {
      throw new UnauthorizedException('Refresh token tidak valid atau expired');
    }

    throw new UnauthorizedException('Refresh token tidak valid');
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.createdAt,
    };
  }
}
