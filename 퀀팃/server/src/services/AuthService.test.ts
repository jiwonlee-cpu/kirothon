import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AuthService, AuthError } from './AuthService.js';
import { InviteService } from './InviteService.js';
import { InviteConfigService } from './InviteConfigService.js';
import { UserRepository } from '../repositories/UserRepository.js';
import { InviteRepository } from '../repositories/InviteRepository.js';
import { InviteConfigRepository } from '../repositories/InviteConfigRepository.js';
import { initializeDatabase } from '../db.js';
import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'dev-secret';

function createTestDb() {
  const dbPath = path.join(os.tmpdir(), `test-auth-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
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

function getIslandIds(db: Database.Database): string[] {
  return (db.prepare('SELECT id FROM islands ORDER BY sort_order').all() as { id: string }[]).map((r) => r.id);
}

function getMissionIds(db: Database.Database, islandId: string): string[] {
  return (
    db.prepare('SELECT id FROM missions WHERE island_id = ? AND is_active = 1 ORDER BY sort_order').all(islandId) as { id: string }[]
  ).map((r) => r.id);
}

describe('AuthService', () => {
  let db: Database.Database;
  let dbPath: string;
  let authService: AuthService;
  let inviteService: InviteService;
  let inviteConfigService: InviteConfigService;
  let adminId: string;

  beforeEach(() => {
    ({ db, dbPath } = createTestDb());
    const userRepo = new UserRepository(db);
    const inviteRepo = new InviteRepository(db);
    const inviteConfigRepo = new InviteConfigRepository(db);
    inviteService = new InviteService(inviteRepo);
    inviteConfigService = new InviteConfigService(inviteConfigRepo, inviteRepo);
    authService = new AuthService(userRepo, inviteService, inviteConfigRepo, db);
    adminId = createHrAdmin(db);
  });

  afterEach(() => {
    cleanupDb(db, dbPath);
  });

  describe('register', () => {
    it('should create a user with a valid invite token', async () => {
      const invite = inviteService.createInvite('newuser@test.com', 'Engineering', adminId);

      const result = await authService.register({
        token: invite.token,
        name: 'New User',
        password: 'password123',
      });

      expect(result.user.email).toBe('newuser@test.com');
      expect(result.user.name).toBe('New User');
      expect(result.user.role).toBe('onboardee');
      expect(result.user.department).toBe('Engineering');
      expect(result.accessToken).toBeDefined();
    });

    it('should issue a valid JWT token on registration', async () => {
      const invite = inviteService.createInvite('jwt@test.com', 'HR', adminId);

      const result = await authService.register({
        token: invite.token,
        name: 'JWT User',
        password: 'password123',
      });

      const decoded = jwt.verify(result.accessToken, JWT_SECRET) as { userId: string; email: string; role: string };
      expect(decoded.userId).toBe(result.user.id);
      expect(decoded.email).toBe('jwt@test.com');
      expect(decoded.role).toBe('onboardee');
    });

    it('should mark the invite token as used after registration', async () => {
      const invite = inviteService.createInvite('used@test.com', 'HR', adminId);

      await authService.register({
        token: invite.token,
        name: 'Used Token User',
        password: 'password123',
      });

      const validation = inviteService.validateToken(invite.token);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('used');
    });

    it('should reject registration with an expired token', async () => {
      // Insert an expired invite directly
      const token = uuidv4();
      const pastDate = new Date(Date.now() - 1000).toISOString();
      db.prepare(
        'INSERT INTO invites (id, token, email, department, created_by, used, expires_at) VALUES (?, ?, ?, ?, ?, 0, ?)'
      ).run(uuidv4(), token, 'expired@test.com', 'HR', adminId, pastDate);

      await expect(
        authService.register({ token, name: 'Expired', password: 'pass' })
      ).rejects.toThrow(AuthError);

      await expect(
        authService.register({ token, name: 'Expired', password: 'pass' })
      ).rejects.toThrow('만료');
    });

    it('should reject registration with an already-used token', async () => {
      const invite = inviteService.createInvite('first@test.com', 'HR', adminId);

      await authService.register({
        token: invite.token,
        name: 'First User',
        password: 'password123',
      });

      await expect(
        authService.register({ token: invite.token, name: 'Second User', password: 'pass' })
      ).rejects.toThrow(AuthError);
    });

    it('should reject registration with a non-existent token', async () => {
      await expect(
        authService.register({ token: 'nonexistent', name: 'Nobody', password: 'pass' })
      ).rejects.toThrow(AuthError);
    });

    it('should apply Invite_Config to mission_progress on registration', async () => {
      const invite = inviteService.createInvite('config@test.com', 'HR', adminId);
      const islandIds = getIslandIds(db);
      const missionIds = getMissionIds(db, islandIds[0]);

      // Save invite config with mixed required/optional
      inviteConfigService.saveConfig(invite.id, [
        { missionId: missionIds[0], requirement: 'required' },
        { missionId: missionIds[1], requirement: 'optional' },
        { missionId: missionIds[2], requirement: 'required' },
      ]);

      const result = await authService.register({
        token: invite.token,
        name: 'Config User',
        password: 'password123',
      });

      // Check mission_progress entries
      const progressRows = db
        .prepare('SELECT * FROM mission_progress WHERE onboardee_id = ? ORDER BY mission_id')
        .all(result.user.id) as Array<{
          mission_id: string;
          status: string;
          requirement: string;
        }>;

      expect(progressRows).toHaveLength(3);

      // Verify each progress entry matches the config
      const progressMap = new Map(progressRows.map((r) => [r.mission_id, r]));
      expect(progressMap.get(missionIds[0])?.requirement).toBe('required');
      expect(progressMap.get(missionIds[0])?.status).toBe('not_started');
      expect(progressMap.get(missionIds[1])?.requirement).toBe('optional');
      expect(progressMap.get(missionIds[2])?.requirement).toBe('required');
    });

    it('should register successfully even without Invite_Config', async () => {
      const invite = inviteService.createInvite('noconfig@test.com', 'HR', adminId);

      const result = await authService.register({
        token: invite.token,
        name: 'No Config User',
        password: 'password123',
      });

      expect(result.user.email).toBe('noconfig@test.com');

      const progressRows = db
        .prepare('SELECT * FROM mission_progress WHERE onboardee_id = ?')
        .all(result.user.id);
      expect(progressRows).toHaveLength(0);
    });
  });

  describe('login', () => {
    it('should login with correct credentials and return JWT', async () => {
      const invite = inviteService.createInvite('login@test.com', 'HR', adminId);
      await authService.register({
        token: invite.token,
        name: 'Login User',
        password: 'mypassword',
      });

      const result = await authService.login({
        email: 'login@test.com',
        password: 'mypassword',
      });

      expect(result.user.email).toBe('login@test.com');
      expect(result.user.name).toBe('Login User');
      expect(result.accessToken).toBeDefined();

      const decoded = jwt.verify(result.accessToken, JWT_SECRET) as { userId: string; role: string };
      expect(decoded.userId).toBe(result.user.id);
      expect(decoded.role).toBe('onboardee');
    });

    it('should reject login with wrong password', async () => {
      const invite = inviteService.createInvite('wrongpass@test.com', 'HR', adminId);
      await authService.register({
        token: invite.token,
        name: 'Wrong Pass',
        password: 'correct',
      });

      await expect(
        authService.login({ email: 'wrongpass@test.com', password: 'incorrect' })
      ).rejects.toThrow('올바르지 않습니다');
    });

    it('should reject login with non-existent email', async () => {
      await expect(
        authService.login({ email: 'nobody@test.com', password: 'pass' })
      ).rejects.toThrow(AuthError);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid JWT token', async () => {
      const invite = inviteService.createInvite('verify@test.com', 'HR', adminId);
      const result = await authService.register({
        token: invite.token,
        name: 'Verify User',
        password: 'password123',
      });

      const payload = authService.verifyToken(result.accessToken);
      expect(payload.userId).toBe(result.user.id);
      expect(payload.email).toBe('verify@test.com');
      expect(payload.role).toBe('onboardee');
    });

    it('should throw for an invalid token', () => {
      expect(() => authService.verifyToken('invalid-token')).toThrow(AuthError);
    });

    it('should throw for an expired token', () => {
      const expiredToken = jwt.sign(
        { userId: 'test', email: 'test@test.com', role: 'onboardee' },
        JWT_SECRET,
        { expiresIn: '0s' }
      );

      expect(() => authService.verifyToken(expiredToken)).toThrow(AuthError);
    });
  });
});
