import { Router, Request, Response } from 'express';
import { InviteService } from '../services/InviteService.js';
import { InviteConfigService } from '../services/InviteConfigService.js';
import { authenticate, authorize } from '../middleware/auth.js';

export function createInviteController(
  inviteService: InviteService,
  inviteConfigService: InviteConfigService
): Router {
  const router = Router();

  /**
   * POST /api/invites — 초대 링크 생성 (HR_Admin 전용)
   * body: { email, department, config: [{ missionId, requirement }] }
   * Requirements: 1.1, 1.2, 1.3
   */
  router.post('/', authenticate, authorize('hr_admin'), (req: Request, res: Response) => {
    try {
      const { email, department, config } = req.body;

      if (!email || !department) {
        res.status(400).json({
          error: { code: 'MISSING_FIELDS', message: '이메일과 소속 본부는 필수 입력 항목입니다.' },
        });
        return;
      }

      const createdBy = req.user!.userId;

      // 1. 초대 생성
      const invite = inviteService.createInvite(email, department, createdBy);

      // 2. InviteConfig 저장 (config가 있는 경우)
      let configs: Array<{ missionId: string; requirement: 'required' | 'optional' }> = [];
      if (config && Array.isArray(config) && config.length > 0) {
        const configResult = inviteConfigService.saveConfigForInvite(invite.id, config);
        configs = configResult.configs;
      }

      // MVP: 이메일 발송은 콘솔 로그로 대체
      const inviteLink = `${req.protocol}://${req.get('host')}/invite/${invite.token}`;
      console.log(`[Email Service] 초대 링크 발송 — To: ${email}, Link: ${inviteLink}`);

      res.status(201).json({
        id: invite.id,
        token: invite.token,
        email: invite.email,
        department: invite.department,
        expiresAt: invite.expiresAt,
        config: configs,
        inviteLink,
      });
    } catch (err) {
      console.error('Invite creation error:', err);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' },
      });
    }
  });

  /**
   * GET /api/invites/:token — 초대 링크 유효성 검증
   * 인증 불필요 (초대 링크 접속 시 사용)
   * Requirements: 1.1, 1.5, 1.6
   */
  router.get('/:token', (req: Request, res: Response) => {
    try {
      const { token } = req.params;
      const validation = inviteService.validateToken(token);

      if (!validation.valid) {
        const statusMap: Record<string, number> = {
          expired: 410,
          used: 409,
          not_found: 404,
        };
        const codeMap: Record<string, string> = {
          expired: 'INVITE_EXPIRED',
          used: 'INVITE_USED',
          not_found: 'INVITE_NOT_FOUND',
        };
        const messageMap: Record<string, string> = {
          expired: '초대 링크가 만료되었습니다. HR 담당자에게 새 초대를 요청해주세요.',
          used: '이미 사용된 초대 링크입니다. 기존 계정으로 로그인해주세요.',
          not_found: '유효하지 않은 초대 링크입니다.',
        };
        const reason = validation.reason!;
        res.status(statusMap[reason] ?? 400).json({
          error: {
            code: codeMap[reason] ?? 'INVALID_INVITE',
            message: messageMap[reason] ?? '유효하지 않은 초대 링크입니다.',
          },
        });
        return;
      }

      const invite = validation.invite!;
      res.json({
        valid: true,
        email: invite.email,
        department: invite.department,
        expiresAt: invite.expires_at,
      });
    } catch (err) {
      console.error('Invite validation error:', err);
      res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' },
      });
    }
  });

  return router;
}
