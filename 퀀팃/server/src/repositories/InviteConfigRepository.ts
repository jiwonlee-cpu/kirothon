import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

export interface InviteConfig {
  id: string;
  invite_id: string;
  mission_id: string;
  requirement: 'required' | 'optional';
}

export interface InviteConfigInput {
  missionId: string;
  requirement: 'required' | 'optional';
}

export class InviteConfigRepository {
  constructor(private db: Database.Database) {}

  /**
   * 단일 InviteConfig 항목 저장
   */
  create(inviteId: string, missionId: string, requirement: 'required' | 'optional'): InviteConfig {
    const id = uuidv4();
    this.db
      .prepare(
        `INSERT INTO invite_configs (id, invite_id, mission_id, requirement)
         VALUES (?, ?, ?, ?)`
      )
      .run(id, inviteId, missionId, requirement);

    return { id, invite_id: inviteId, mission_id: missionId, requirement };
  }

  /**
   * 초대 ID에 대한 모든 config를 일괄 저장 (기존 config 교체)
   */
  bulkSave(inviteId: string, configs: InviteConfigInput[]): InviteConfig[] {
    const deleteStmt = this.db.prepare('DELETE FROM invite_configs WHERE invite_id = ?');
    const insertStmt = this.db.prepare(
      'INSERT INTO invite_configs (id, invite_id, mission_id, requirement) VALUES (?, ?, ?, ?)'
    );

    const results: InviteConfig[] = [];

    const transaction = this.db.transaction(() => {
      deleteStmt.run(inviteId);
      for (const config of configs) {
        const id = uuidv4();
        insertStmt.run(id, inviteId, config.missionId, config.requirement);
        results.push({
          id,
          invite_id: inviteId,
          mission_id: config.missionId,
          requirement: config.requirement,
        });
      }
    });

    transaction();
    return results;
  }

  /**
   * 초대 ID로 모든 config 조회
   */
  findByInviteId(inviteId: string): InviteConfig[] {
    return this.db
      .prepare('SELECT * FROM invite_configs WHERE invite_id = ? ORDER BY mission_id')
      .all(inviteId) as InviteConfig[];
  }

  /**
   * 특정 초대의 특정 미션 config 조회
   */
  findByInviteAndMission(inviteId: string, missionId: string): InviteConfig | null {
    const row = this.db
      .prepare('SELECT * FROM invite_configs WHERE invite_id = ? AND mission_id = ?')
      .get(inviteId, missionId) as InviteConfig | undefined;
    return row ?? null;
  }

  /**
   * 초대 ID에 대한 모든 config 삭제
   */
  deleteByInviteId(inviteId: string): void {
    this.db.prepare('DELETE FROM invite_configs WHERE invite_id = ?').run(inviteId);
  }
}
