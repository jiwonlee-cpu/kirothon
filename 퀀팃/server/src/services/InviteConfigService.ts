import { InviteConfigRepository, InviteConfig, InviteConfigInput } from '../repositories/InviteConfigRepository.js';
import { InviteRepository } from '../repositories/InviteRepository.js';

export interface InviteConfigResult {
  inviteId: string;
  configs: Array<{
    missionId: string;
    requirement: 'required' | 'optional';
  }>;
}

export class InviteConfigService {
  constructor(
    private inviteConfigRepository: InviteConfigRepository,
    private inviteRepository: InviteRepository
  ) {}

  /**
   * Invite_Config 저장 — Island별 미션의 Required/Optional 설정
   * Requirements: 1.2, 1.3, 3.6, 3.7
   */
  saveConfig(inviteId: string, configs: InviteConfigInput[]): InviteConfigResult {
    // 초대가 존재하는지 확인
    const invite = this.inviteRepository.findById(inviteId);
    if (!invite) {
      throw new Error(`Invite not found: ${inviteId}`);
    }

    // 동일 Island 내 미션 중 일부는 Required, 나머지는 Optional로 혼합 지정 허용 (요구사항 3.7)
    const saved = this.inviteConfigRepository.bulkSave(inviteId, configs);

    return {
      inviteId,
      configs: saved.map((c) => ({
        missionId: c.mission_id,
        requirement: c.requirement,
      })),
    };
  }

  /**
   * Invite_Config 조회
   * Requirements: 1.2, 1.3
   */
  getConfig(inviteId: string): InviteConfigResult {
    const invite = this.inviteRepository.findById(inviteId);
    if (!invite) {
      throw new Error(`Invite not found: ${inviteId}`);
    }

    const configs = this.inviteConfigRepository.findByInviteId(inviteId);

    return {
      inviteId,
      configs: configs.map((c) => ({
        missionId: c.mission_id,
        requirement: c.requirement,
      })),
    };
  }

  /**
   * 초대 링크에 config 연결 — 초대 생성 시 config도 함께 저장
   * Requirements: 1.3
   */
  saveConfigForInvite(
    inviteId: string,
    configs: InviteConfigInput[]
  ): InviteConfigResult {
    return this.saveConfig(inviteId, configs);
  }

  /**
   * 특정 초대의 특정 미션 requirement 조회
   */
  getMissionRequirement(inviteId: string, missionId: string): 'required' | 'optional' | null {
    const config = this.inviteConfigRepository.findByInviteAndMission(inviteId, missionId);
    return config?.requirement ?? null;
  }
}
