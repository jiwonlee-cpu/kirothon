import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InviteService } from './InviteService.js';
import { InviteRepository } from '../repositories/InviteRepository.js';
import { initializeDatabase } from '../db.js';
import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

function createTestDb() {
  const dbPath = path.join(os.tmpdir(), `test-invite-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  const db = initializeDatabase(dbPath);
  return { db, dbPath };
}

function createHrAdmin(db: Database.Database): string {
  const id = uuidv4();
  db.prepare(
    "INSERT INTO users (id, email, name, password_hash, role, department) VALUES (?, ?, ?, ?, 'hr_admin', 'HR')"
  ).run(id, `admin-${id}@test.com`, 'Test Admin', 'hash');
  return id;
}

describe('InviteRepository', () => {
  let db: Database.Database;
  let dbPath: string;
  let repo: InviteRepository;
  let adminId: string;

  beforeEach(() => {
    ({ db, dbPath } = createTestDb());
    repo = new InviteRepository(db);
    adminId = createHrAdmin(db);
  });

  afterEach(() => {
    db.close();
    for (const suffix of ['', '-wal', '-shm']) {
      const p = dbPath + suffix;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  });

  it('should create an invite and retrieve it by token', () => {
    const invite = repo.create({
      token: 'test-token-123',
      email: 'new@test.com',
      department: 'Engineering',
      createdBy: adminId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    expect(invite.token).toBe('test-token-123');
    expect(invite.email).toBe('new@test.com');
    expect(invite.used).toBe(0);

    const found = repo.findByToken('test-token-123');
    expect(found).not.toBeNull();
    expect(found!.id).toBe(invite.id);
  });

  it('should return null for non-existent token', () => {
    const found = repo.findByToken('nonexistent');
    expect(found).toBeNull();
  });

  it('should mark invite as used', () => {
    repo.create({
      token: 'use-me',
      email: 'user@test.com',
      createdBy: adminId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    repo.markUsed('use-me');
    const found = repo.findByToken('use-me');
    expect(found!.used).toBe(1);
  });
});

describe('InviteService', () => {
  let db: Database.Database;
  let dbPath: string;
  let service: InviteService;
  let adminId: string;

  beforeEach(() => {
    ({ db, dbPath } = createTestDb());
    const repo = new InviteRepository(db);
    service = new InviteService(repo);
    adminId = createHrAdmin(db);
  });

  afterEach(() => {
    db.close();
    for (const suffix of ['', '-wal', '-shm']) {
      const p = dbPath + suffix;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  });

  describe('createInvite', () => {
    it('should create an invite with unique token and 7-day expiry', () => {
      const result = service.createInvite('new@test.com', 'Engineering', adminId);

      expect(result.token).toBeDefined();
      expect(result.email).toBe('new@test.com');
      expect(result.department).toBe('Engineering');

      const expiresAt = new Date(result.expiresAt);
      const now = new Date();
      const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(6.9);
      expect(diffDays).toBeLessThanOrEqual(7);
    });

    it('should generate unique tokens for different invites', () => {
      const invite1 = service.createInvite('a@test.com', 'HR', adminId);
      const invite2 = service.createInvite('b@test.com', 'Engineering', adminId);
      expect(invite1.token).not.toBe(invite2.token);
    });
  });

  describe('validateToken', () => {
    it('should return valid for a fresh, unused token', () => {
      const invite = service.createInvite('user@test.com', 'HR', adminId);
      const result = service.validateToken(invite.token);

      expect(result.valid).toBe(true);
      expect(result.invite).toBeDefined();
    });

    it('should return not_found for non-existent token', () => {
      const result = service.validateToken('does-not-exist');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('not_found');
    });

    it('should return used for already-used token', () => {
      const invite = service.createInvite('user@test.com', 'HR', adminId);
      service.markUsed(invite.token);

      const result = service.validateToken(invite.token);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('used');
    });

    it('should return expired for token past 7 days', () => {
      // Directly insert an expired invite
      const token = uuidv4();
      const pastDate = new Date(Date.now() - 1000).toISOString(); // 1 second ago
      db.prepare(
        'INSERT INTO invites (id, token, email, department, created_by, used, expires_at) VALUES (?, ?, ?, ?, ?, 0, ?)'
      ).run(uuidv4(), token, 'expired@test.com', 'HR', adminId, pastDate);

      const result = service.validateToken(token);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('expired');
    });
  });

  describe('markUsed', () => {
    it('should mark a token as used', () => {
      const invite = service.createInvite('user@test.com', 'HR', adminId);

      // Before marking
      let validation = service.validateToken(invite.token);
      expect(validation.valid).toBe(true);

      // Mark as used
      service.markUsed(invite.token);

      // After marking
      validation = service.validateToken(invite.token);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('used');
    });
  });
});
