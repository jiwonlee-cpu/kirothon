import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JwtPayload } from '../services/AuthService.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';

// Express Request에 user 정보 추가
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * JWT 인증 미들웨어 — Authorization 헤더에서 Bearer 토큰을 검증
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: '인증 토큰이 필요합니다.' },
    });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: '유효하지 않은 인증 토큰입니다.' },
    });
  }
}

/**
 * 역할 기반 접근 제어 미들웨어
 * authenticate 미들웨어 이후에 사용해야 합니다.
 */
export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: '접근 권한이 없습니다.' },
      });
      return;
    }

    next();
  };
}
