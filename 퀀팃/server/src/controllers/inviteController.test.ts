import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { InviteService } from '../services/InviteService.js';
import { InviteConfigService } from '../services/InviteConfigService.js';
import { InviteRepository } from '../repositories/InviteRepository.js';
import { InviteConfigRepository } from '../repositories/InviteConfigRepository.js';
import { createInviteController } from './inviteController.js';
import { initializeDatabase } from '../db.js';
import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';

function createTestDb() {
  const dbPath = path.join(os.tmpdir(), `test-invite-ctrl-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
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

function createHrAdmin(db: Database.Database): { id: string; token: string } {
  const id = uuidv4();
  db.prepare(
    "INSERT INTO users (id, email, name, password_hash, role, department) VALUES (?, ?, ?, ?, 'hr_admin', 'HR')"
  ).run(id, `admin-${id}@test.com`, 'Test Admin', 'hash');
  const token = jwt.sign({ userId: id, email: `admin-${id}@test.com`, role: 'hr_admin' }, JWT_SECRET, { expiresIn: '1h' });
  return { id, token };
}

function createOnboardee(db: Database.Database): { id: string; token: string } {
  const id = uuidv4();
  db.prepare(
    "INSERT INTO users (id, email, name, password_hash, role, department) VALUES (?, ?, ?, ?, 'onboardee', 'Engineering')"
  ).run(id, `user-${id}@test.com`, 'Test User', 'hash');
  const token = jwt.sign({ userId: id, email: `user-${id}@test.com`, role: 'onboardee' }, JWT_SECRET, { expiresIn: '1h' });
  return { id, token };
}

function createMission(db: Database.Database, islandId: string): string {
  const id = uuidv4();
  db.prepare(
    "INSERT INTO missions (id, island_id, title, description, type, content, sort_order, is_active) VALUES (?, ?, ?, ?, 'info', '{}', 1, 1)"
  ).run(id, islandId, 'Test Mission', 'Test Description');
  return id;
}

describe('Invite Controller', () => {
  let db: Database.Database;
  let dbPath: string;
  let app: express.Express;
  let inviteService: InviteService;
  let admin: { id: string; token: string };

  beforeEach(() => {
    ({ db, dbPath } = createTestDb());
    const inviteRepo = new InviteRepository(db);
    const inviteConfigRepo = new InviteConfigRepository(db);
    inviteService = new InviteService(inviteRepo);
    const inviteConfigService = new InviteConfigService(inviteConfigRepo, inviteRepo);

    app = express();
    app.use(express.json());
    app.use('/api/invites', createInviteController(inviteService, inviteConfigService));

    admin = createHrAdmin(db);
  });

  afterEach(() => {
    cleanupDb(db, dbPath);
  });

  describe('POST /api/invites', () => {
    it('should create an invite with valid HR_Admin token', async () => {
      const res = await request(app)
        .post('/api/invites')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ email: 'newbie@test.com', department: 'Engineering' });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe('newbie@test.com');
      expect(res.body.department).toBe('Engineering');
      expect(res.body.token).toBeDefined();
      expect(res.body.id).toBeDefined();
      expect(res.body.expiresAt).toBeDefined();
      expect(res.body.inviteLink).toContain(res.body.token);
    });

    it('should create an invite with config', async () => {
      // Get an island ID from seed data
      const island = db.prepare('SELECT id FROM islands LIMIT 1').get() as { id: string };
      const missionId = createMission(db, island.id);

      const res = await request(app)
        .post('/api/invites')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({
          email: 'configured@test.com',
          department: 'HR',
          config: [{ missionId, requirement: 'required' }],
        });

      expect(res.status).toBe(201);
      expect(res.body.config).toHaveLength(1);
      expect(res.body.config[0].missionId).toBe(missionId);
      expect(res.body.config[0].requirement).toBe('required');
    });

    it('should create an invite without config', async () => {
      const res = await request(app)
        .post('/api/invites')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ email: 'noconfig@test.com', department: 'Sales' });

      expect(res.status).toBe(201);
      expect(res.body.config).toEqual([]);
    });

    it('should return 400 when email is missing', async () => {
      const res = await request(app)
        .post('/api/invites')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ department: 'HR' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_FIELDS');
    });

    it('should return 400 when department is missing', async () => {
      const res = await request(app)
        .post('/api/invites')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_FIELDS');
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/invites')
        .send({ email: 'test@test.com', department: 'HR' });

      expect(res.status).toBe(401);
    });

    it('should return 403 for non-HR_Admin user', async () => {
      const onboardee = createOnboardee(db);

      const res = await request(app)
        .post('/api/invites')
        .set('Authorization', `Bearer ${onboardee.token}`)
        .send({ email: 'test@test.com', department: 'HR' });

      expect(res.status).toBe(403);
    });

    it('should log invite link to console (MVP email replacement)', async () => {
      const consoleSpy = vi.spyOn(console, 'log');

      await request(app)
        .post('/api/invites')
        .set('Authorization', `Bearer ${admin.token}`)
        .send({ email: 'email-test@test.com', department: 'HR' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Email Service]')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('email-test@test.com')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('GET /api/invites/:token', () => {
    it('should validate a valid invite token', async () => {
      const invite = inviteService.createInvite('valid@test.com', 'Engineering', admin.id);

      const res = await request(app)
        .get(`/api/invites/${invite.token}`);

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
      expect(res.body.email).toBe('valid@test.com');
      expect(res.body.department).toBe('Engineering');
      expect(res.body.expiresAt).toBeDefined();
    });

    it('should not require authentication', async () => {
      const invite = inviteService.createInvite('noauth@test.com', 'HR', admin.id);

      const res = await request(app)
        .get(`/api/invites/${invite.token}`);

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
    });

    it('should return 404 for non-existent token', async () => {
      const res = await request(app)
        .get('/api/invites/nonexistent-token');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('INVITE_NOT_FOUND');
    });

    it('should return 410 for expired token', async () => {
      const token = uuidv4();
      const pastDate = new Date(Date.now() - 1000).toISOString();
      db.prepare(
        'INSERT INTO invites (id, token, email, department, created_by, used, expires_at) VALUES (?, ?, ?, ?, ?, 0, ?)'
      ).run(uuidv4(), token, 'expired@test.com', 'HR', admin.id, pastDate);

      const res = await request(app)
        .get(`/api/invites/${token}`);

      expect(res.status).toBe(410);
      expect(res.body.error.code).toBe('INVITE_EXPIRED');
    });

    it('should return 409 for used token', async () => {
      const invite = inviteService.createInvite('used@test.com', 'HR', admin.id);
      inviteService.markUsed(invite.token);

      const res = await request(app)
        .get(`/api/invites/${invite.token}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('INVITE_USED');
    });
  });
});
