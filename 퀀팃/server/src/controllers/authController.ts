import { Router, Request, Response } from 'express';
import { AuthService, AuthError } from '../services/AuthService.js';

export function createAuthController(authService: AuthService): Router {
  const router = Router();

  /**
   * POST /api/auth/register — 초대 기반 계정 생성
   * Requirements: 1.4, 1.7
   */
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const { token, name, password } = req.body;

      if (!token || !name || !password) {
        res.status(400).json({
          error: { code: 'MISSING_FIELDS', message: '토큰, 이름, 비밀번호는 필수 입력 항목입니다.' },
        });
        return;
      }

      const result = await authService.register({ token, name, password });
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof AuthError) {
        const statusMap: Record<string, number> = {
          INVITE_EXPIRED: 410,
          INVITE_USED: 409,
          INVITE_NOT_FOUND: 404,
          EMAIL_EXISTS: 409,
        };
        const status = statusMap[err.code] ?? 400;
        res.status(status).json({ error: { code: err.code, message: err.message } });
        return;
      }
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } });
    }
  });

  /**
   * POST /api/auth/login — 로그인 (JWT 발급)
   * Requirements: 1.4
   */
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          error: { code: 'MISSING_FIELDS', message: '이메일과 비밀번호는 필수 입력 항목입니다.' },
        });
        return;
      }

      const result = await authService.login({ email, password });
      res.json(result);
    } catch (err) {
      if (err instanceof AuthError) {
        if (err.code === 'INVALID_CREDENTIALS') {
          res.status(401).json({ error: { code: err.code, message: err.message } });
          return;
        }
      }
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } });
    }
  });

  return router;
}
