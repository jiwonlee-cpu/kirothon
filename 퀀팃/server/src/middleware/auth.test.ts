import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { authenticate, authorize } from './auth.js';

const JWT_SECRET = 'dev-secret';

function createApp() {
  const app = express();
  app.use(express.json());

  // Protected route
  app.get('/protected', authenticate, (_req, res) => {
    res.json({ user: _req.user });
  });

  // Admin-only route
  app.get('/admin', authenticate, authorize('hr_admin'), (_req, res) => {
    res.json({ user: _req.user });
  });

  // Multi-role route
  app.get('/multi', authenticate, authorize('hr_admin', 'onboardee'), (_req, res) => {
    res.json({ user: _req.user });
  });

  return app;
}

function generateToken(payload: object, secret = JWT_SECRET): string {
  return jwt.sign(payload, secret, { expiresIn: '1h' });
}

describe('authenticate middleware', () => {
  const app = createApp();

  it('should return 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 when Authorization header has no Bearer prefix', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Basic some-token');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should return 401 for an invalid JWT token', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('should return 401 for a token signed with wrong secret', async () => {
    const token = generateToken({ userId: '1', email: 'a@b.com', role: 'onboardee' }, 'wrong-secret');
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it('should pass and attach user for a valid token', async () => {
    const token = generateToken({ userId: 'u1', email: 'user@test.com', role: 'onboardee' });
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.userId).toBe('u1');
    expect(res.body.user.email).toBe('user@test.com');
    expect(res.body.user.role).toBe('onboardee');
  });
});

describe('authorize middleware', () => {
  const app = createApp();

  it('should return 403 when user role does not match', async () => {
    const token = generateToken({ userId: 'u1', email: 'user@test.com', role: 'onboardee' });
    const res = await request(app)
      .get('/admin')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('should pass when user role matches', async () => {
    const token = generateToken({ userId: 'a1', email: 'admin@test.com', role: 'hr_admin' });
    const res = await request(app)
      .get('/admin')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('hr_admin');
  });

  it('should pass when user role is one of multiple allowed roles', async () => {
    const onboardeeToken = generateToken({ userId: 'u1', email: 'user@test.com', role: 'onboardee' });
    const adminToken = generateToken({ userId: 'a1', email: 'admin@test.com', role: 'hr_admin' });

    const res1 = await request(app)
      .get('/multi')
      .set('Authorization', `Bearer ${onboardeeToken}`);
    expect(res1.status).toBe(200);

    const res2 = await request(app)
      .get('/multi')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res2.status).toBe(200);
  });
});
