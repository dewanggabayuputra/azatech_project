import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Orders API (e2e)', () => {
  let app: INestApplication<App>;
  let accessToken: string;

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET ??= 'e2e-test-access-secret';
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    accessToken = await moduleRef.get(JwtService).signAsync(
      {
        sub: '00000000-0000-4000-8000-000000000001',
        email: 'test@example.com',
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '15m',
      },
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('menolak request order tanpa token', async () => {
    await request(app.getHttpServer())
      .post('/api/orders')
      .send({
        customer_id: '00000000-0000-4000-8000-000000000001',
        items: [{ product_id: '1', quantity: 1 }],
      })
      .expect(401);
  });

  it('menolak quantity kurang dari 1', async () => {
    await request(app.getHttpServer())
      .post('/api/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        customer_id: '00000000-0000-4000-8000-000000000001',
        items: [{ product_id: '1', quantity: 0 }],
      })
      .expect((response) => {
        if (![400, 422].includes(response.status)) {
          throw new Error(`Status tidak sesuai: ${response.status}`);
        }
      });
  });
});
