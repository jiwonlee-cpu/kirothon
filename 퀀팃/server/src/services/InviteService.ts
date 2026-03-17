import { v4 as uuidv4 } from 'uuid';
import { InviteRepository, Invite } from '../repositories/InviteRepository.js';

export interface InviteToken {
  id: string;
  token: string;
  email: string;
  department: string | null;
  expiresAt: string;
}

export interface InviteValidation {
  valid: boolean;
  reason?: 'expired' | 'used' | 'not_found';
  invite?: Invite;
}

const INVITE_EXPIRY_DAYS = 7;

export class InviteService {
  constructor(private inviteRepository: InviteRepository) {}

  /**
   * 초대 링크 생성 — 고유 토큰 생성, 7일 만료 설정
   * Requirements: 1.1
   */
  createInvite(email: string, department: string, createdBy: string): InviteToken {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const invite = this.inviteRepository.create({
      token,
      email,
      department,
      createdBy,
      expiresAt,
    });

    return {
      id: invite.id,
      token: invite.token,
      email: invite.email,
      department: invite.department,
      expiresAt: invite.expires_at,
    };
  }

  /**
   * 토큰 유효성 검증 — 만료 여부, 사용 여부 확인
   * Requirements: 1.5, 1.6
   */
  validateToken(token: string): InviteValidation {
    const invite = this.inviteRepository.findByToken(token);

    if (!invite) {
      return { valid: false, reason: 'not_found' };
    }

    if (invite.used) {
      return { valid: false, reason: 'used' };
    }

    const now = new Date();
    const expiresAt = new Date(invite.expires_at);
    if (now >= expiresAt) {
      return { valid: false, reason: 'expired' };
    }

    return { valid: true, invite };
  }

  /**
   * 토큰 사용 처리 — used 플래그 업데이트
   * Requirements: 1.6
   */
  markUsed(token: string): void {
    this.inviteRepository.markUsed(token);
  }
}
