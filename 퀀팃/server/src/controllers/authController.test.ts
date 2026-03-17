import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { AuthService } from '../services/AuthService.js';
import { InviteService } from '../services/InviteService.js';
import { InviteConfigService } from '../services/InviteConfigService.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { InviteRepository } from '../repositories/InviteRepository.js';
import { InviteConfigRepository } from '../repositories/InviteConfigRepository.js';
import { createAuthController } from './authController.js';
import { initializeDatabase } from '../db.js';
import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

function createTestDb() {
  const dbPath = path.join(os.tmpdir(), `test-auth-ctrl-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  const db = initializeDatabase(dbPath);
  return { db, dbPath };
}

function cleanupDb(db: Database.Database, dbPath: string) {
  db.close();
  for (const suffix of ['', '-wal', '-shm']) {
    const p = dbPath + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

function createHrAdmin(db: Database.Database): string {
  const id = uuidv4();
  db.prepare(
    "INSERT INTO users (id, email, name, password_hash, role, department) VALUES (?, ?, ?, ?, 'hr_admin', 'HR')"
  ).run(id, `admin-${id}@test.com`, 'Test Admin', 'hash');
  return id;
}

describe('Auth Controller', () => {
  let db: Database.Database;
  let dbPath: string;
  let app: express.Express;
  let inviteService: InviteService;
  let adminId: string;

  beforeEach(() => {
    ({ db, dbPath } = createTestDb());
    const userRepo = new UserRepository(db);
    const inviteRepo = new InviteRepository(db);
    const inviteConfigRepo = new InviteConfigRepository(db);
    inviteService = new InviteService(inviteRepo);
    const authService = new AuthService(userRepo, inviteService, inviteConfigRepo, db);

    app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthController(authService));

    adminId = createHrAdmin(db);
  });

  afterEach(() => {
    cleanupDb(db, dbPath);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user with valid invite token', async () => {
      const invite = inviteService.createInvite('new@test.com', 'Engineering', adminId);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ token: invite.token, name: 'New User', password: 'password123' });

      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('new@test.com');
      expect(res.body.user.name).toBe('New User');
      expect(res.body.user.role).toBe('onboardee');
      expect(res.body.accessToken).toBeDefined();
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ token: 'some-token' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_FIELDS');
    });

    it('should return 410 for expired invite token', async () => {
      const token = uuidv4();
      const pastDate = new Date(Date.now() - 1000).toISOString();
      db.prepare(
        'INSERT INTO invites (id, token, email, department, created_by, used, expires_at) VALUES (?, ?, ?, ?, ?, 0, ?)'
      ).run(uuidv4(), token, 'expired@test.com', 'HR', adminId, pastDate);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ token, name: 'Expired', password: 'pass123' });

      expect(res.status).toBe(410);
      expect(res.body.error.code).toBe('INVITE_EXPIRED');
    });

    it('should return 409 for already-used invite token', async () => {
      const invite = inviteService.createInvite('used@test.com', 'HR', adminId);

      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({ token: invite.token, name: 'First', password: 'pass123' });

      // Second attempt
      const res = await request(app)
        .post('/api/auth/register')
        .send({ token: invite.token, name: 'Second', password: 'pass123' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVITE_USED');
    });

    it('should return 404 for non-existent invite token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ token: 'nonexistent', name: 'Nobody', password: 'pass123' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('INVITE_NOT_FOUND');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with correct credentials', async () => {
      const invite = inviteService.createInvite('login@test.com', 'HR', adminId);
      await request(app)
        .post('/api/auth/register')
        .send({ token: invite.token, name: 'Login User', password: 'mypassword' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@test.com', password: 'mypassword' });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('login@test.com');
      expect(res.body.accessToken).toBeDefined();
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_FIELDS');
    });

    it('should return 401 for wrong password', async () => {
      const invite = inviteService.createInvite('wrong@test.com', 'HR', adminId);
      await request(app)
        .post('/api/auth/register')
        .send({ token: invite.token, name: 'Wrong', password: 'correct' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'wrong@test.com', password: 'incorrect' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'pass' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });
});
