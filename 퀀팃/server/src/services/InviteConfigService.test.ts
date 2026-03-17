import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { InviteConfigService } from './InviteConfigService.js';
import { InviteConfigRepository } from '../repositories/InviteConfigRepository.js';
import { InviteRepository } from '../repositories/InviteRepository.js';
import { InviteService } from './InviteService.js';
import { initializeDatabase } from '../db.js';
import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

function createTestDb() {
  const dbPath = path.join(os.tmpdir(), `test-invite-config-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
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

describe('InviteConfigRepository', () => {
  let db: Database.Database;
  let dbPath: string;
  let repo: InviteConfigRepository;
  let inviteRepo: InviteRepository;
  let adminId: string;
  let inviteId: string;
  let missionIds: string[];

  beforeEach(() => {
    ({ db, dbPath } = createTestDb());
    repo = new InviteConfigRepository(db);
    inviteRepo = new InviteRepository(db);
    adminId = createHrAdmin(db);

    const invite = inviteRepo.create({
      token: uuidv4(),
      email: 'test@test.com',
      department: 'HR',
      createdBy: adminId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    inviteId = invite.id;

    const islandIds = getIslandIds(db);
    missionIds = getMissionIds(db, islandIds[0]);
  });

  afterEach(() => {
    cleanupDb(db, dbPath);
  });

  it('should create a single config entry', () => {
    const config = repo.create(inviteId, missionIds[0], 'required');

    expect(config.invite_id).toBe(inviteId);
    expect(config.mission_id).toBe(missionIds[0]);
    expect(config.requirement).toBe('required');
    expect(config.id).toBeDefined();
  });

  it('should find configs by invite id', () => {
    repo.create(inviteId, missionIds[0], 'required');
    repo.create(inviteId, missionIds[1], 'optional');

    const configs = repo.findByInviteId(inviteId);
    expect(configs).toHaveLength(2);
  });

  it('should find config by invite and mission', () => {
    repo.create(inviteId, missionIds[0], 'required');

    const config = repo.findByInviteAndMission(inviteId, missionIds[0]);
    expect(config).not.toBeNull();
    expect(config!.requirement).toBe('required');
  });

  it('should return null for non-existent invite+mission combo', () => {
    const config = repo.findByInviteAndMission(inviteId, 'nonexistent');
    expect(config).toBeNull();
  });

  it('should bulk save configs replacing existing ones', () => {
    // First save
    repo.bulkSave(inviteId, [
      { missionId: missionIds[0], requirement: 'required' },
      { missionId: missionIds[1], requirement: 'optional' },
    ]);

    let configs = repo.findByInviteId(inviteId);
    expect(configs).toHaveLength(2);

    // Second save replaces all
    repo.bulkSave(inviteId, [
      { missionId: missionIds[0], requirement: 'optional' },
    ]);

    configs = repo.findByInviteId(inviteId);
    expect(configs).toHaveLength(1);
    expect(configs[0].requirement).toBe('optional');
  });

  it('should delete configs by invite id', () => {
    repo.create(inviteId, missionIds[0], 'required');
    repo.create(inviteId, missionIds[1], 'optional');

    repo.deleteByInviteId(inviteId);

    const configs = repo.findByInviteId(inviteId);
    expect(configs).toHaveLength(0);
  });

  it('should return empty array for invite with no configs', () => {
    const configs = repo.findByInviteId(inviteId);
    expect(configs).toHaveLength(0);
  });
});

describe('InviteConfigService', () => {
  let db: Database.Database;
  let dbPath: string;
  let service: InviteConfigService;
  let inviteService: InviteService;
  let adminId: string;
  let inviteId: string;
  let missionIds: string[];

  beforeEach(() => {
    ({ db, dbPath } = createTestDb());
    const inviteRepo = new InviteRepository(db);
    const configRepo = new InviteConfigRepository(db);
    service = new InviteConfigService(configRepo, inviteRepo);
    inviteService = new InviteService(inviteRepo);
    adminId = createHrAdmin(db);

    const invite = inviteService.createInvite('onboardee@test.com', 'Engineering', adminId);
    inviteId = invite.id;

    const islandIds = getIslandIds(db);
    missionIds = getMissionIds(db, islandIds[0]);
  });

  afterEach(() => {
    cleanupDb(db, dbPath);
  });

  describe('saveConfig', () => {
    it('should save config for an invite with mixed required/optional missions', () => {
      const result = service.saveConfig(inviteId, [
        { missionId: missionIds[0], requirement: 'required' },
        { missionId: missionIds[1], requirement: 'optional' },
        { missionId: missionIds[2], requirement: 'required' },
      ]);

      expect(result.inviteId).toBe(inviteId);
      expect(result.configs).toHaveLength(3);
      expect(result.configs[0].requirement).toBe('required');
      expect(result.configs[1].requirement).toBe('optional');
      expect(result.configs[2].requirement).toBe('required');
    });

    it('should replace existing config when saving again', () => {
      service.saveConfig(inviteId, [
        { missionId: missionIds[0], requirement: 'required' },
        { missionId: missionIds[1], requirement: 'required' },
      ]);

      const result = service.saveConfig(inviteId, [
        { missionId: missionIds[0], requirement: 'optional' },
      ]);

      expect(result.configs).toHaveLength(1);
      expect(result.configs[0].missionId).toBe(missionIds[0]);
      expect(result.configs[0].requirement).toBe('optional');
    });

    it('should throw error for non-existent invite', () => {
      expect(() =>
        service.saveConfig('nonexistent-id', [
          { missionId: missionIds[0], requirement: 'required' },
        ])
      ).toThrow('Invite not found');
    });

    it('should handle empty config array', () => {
      const result = service.saveConfig(inviteId, []);
      expect(result.configs).toHaveLength(0);
    });
  });

  describe('getConfig', () => {
    it('should retrieve saved config', () => {
      service.saveConfig(inviteId, [
        { missionId: missionIds[0], requirement: 'required' },
        { missionId: missionIds[1], requirement: 'optional' },
      ]);

      const result = service.getConfig(inviteId);

      expect(result.inviteId).toBe(inviteId);
      expect(result.configs).toHaveLength(2);
    });

    it('should return empty configs for invite with no config', () => {
      const result = service.getConfig(inviteId);
      expect(result.configs).toHaveLength(0);
    });

    it('should throw error for non-existent invite', () => {
      expect(() => service.getConfig('nonexistent-id')).toThrow('Invite not found');
    });

    it('should return configs that match what was saved (roundtrip)', () => {
      const input = [
        { missionId: missionIds[0], requirement: 'required' as const },
        { missionId: missionIds[1], requirement: 'optional' as const },
        { missionId: missionIds[2], requirement: 'required' as const },
      ];

      service.saveConfig(inviteId, input);
      const result = service.getConfig(inviteId);

      // Sort both by missionId for comparison
      const sortedInput = [...input].sort((a, b) => a.missionId.localeCompare(b.missionId));
      const sortedResult = [...result.configs].sort((a, b) => a.missionId.localeCompare(b.missionId));

      expect(sortedResult).toHaveLength(sortedInput.length);
      for (let i = 0; i < sortedInput.length; i++) {
        expect(sortedResult[i].missionId).toBe(sortedInput[i].missionId);
        expect(sortedResult[i].requirement).toBe(sortedInput[i].requirement);
      }
    });
  });

  describe('getMissionRequirement', () => {
    it('should return requirement for a specific mission', () => {
      service.saveConfig(inviteId, [
        { missionId: missionIds[0], requirement: 'required' },
        { missionId: missionIds[1], requirement: 'optional' },
      ]);

      expect(service.getMissionRequirement(inviteId, missionIds[0])).toBe('required');
      expect(service.getMissionRequirement(inviteId, missionIds[1])).toBe('optional');
    });

    it('should return null for mission not in config', () => {
      const result = service.getMissionRequirement(inviteId, 'nonexistent-mission');
      expect(result).toBeNull();
    });
  });

  describe('saveConfigForInvite', () => {
    it('should save config and link it to the invite', () => {
      const result = service.saveConfigForInvite(inviteId, [
        { missionId: missionIds[0], requirement: 'required' },
      ]);

      expect(result.inviteId).toBe(inviteId);
      expect(result.configs).toHaveLength(1);

      // Verify it can be retrieved
      const retrieved = service.getConfig(inviteId);
      expect(retrieved.configs).toHaveLength(1);
      expect(retrieved.configs[0].missionId).toBe(missionIds[0]);
    });
  });
});
