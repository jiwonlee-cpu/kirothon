import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository, User } from '../repositories/UserRepository.js';
import { InviteService } from './InviteService.js';
import { InviteConfigRepository } from '../repositories/InviteConfigRepository.js';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret';
const JWT_EXPIRES_IN = '24h';

export interface RegisterInput {
  token: string;
  name: string;
  password: string;
}

export interface RegisterResult {
  user: { id: string; email: string; name: string; role: string; department: string | null };
  accessToken: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  user: { id: string; email: string; name: string; role: string; department: string | null };
  accessToken: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private inviteService: InviteService,
    private inviteConfigRepository: InviteConfigRepository,
    private db: Database.Database
  ) {}

  /**
   * 초대 기반 계정 생성
   * 1. 초대 토큰 검증
   * 2. 비밀번호 해싱
   * 3. users 테이블에 사용자 생성 (role: 'onboardee')
   * 4. 초대 토큰 사용 처리
   * 5. Invite_Config의 미션 설정을 mission_progress 테이블에 적용
   * Requirements: 1.4, 1.7
   */
  async register(input: RegisterInput): Promise<RegisterResult> {
    // 1. 초대 토큰 검증
    const validation = this.inviteService.validateToken(input.token);
    if (!validation.valid || !validation.invite) {
      const reason = validation.reason ?? 'unknown';
      if (reason === 'expired') {
        throw new AuthError('INVITE_EXPIRED', '초대 링크가 만료되었습니다. HR 담당자에게 새 초대를 요청해주세요.');
      }
      if (reason === 'used') {
        throw new AuthError('INVITE_USED', '이미 사용된 초대 링크입니다. 기존 계정으로 로그인해주세요.');
      }
      throw new AuthError('INVITE_NOT_FOUND', '유효하지 않은 초대 링크입니다.');
    }

    const invite = validation.invite;

    // 이메일 중복 확인
    const existingUser = this.userRepository.findByEmail(invite.email);
    if (existingUser) {
      throw new AuthError('EMAIL_EXISTS', '이미 가입된 이메일입니다.');
    }

    // 2. 비밀번호 해싱
    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    // 3~5를 트랜잭션으로 처리
    const user = this.db.transaction(() => {
      // 3. 사용자 생성
      const newUser = this.userRepository.create({
        email: invite.email,
        name: input.name,
        passwordHash,
        role: 'onboardee',
        department: invite.department ?? undefined,
      });

      // 4. 초대 토큰 사용 처리
      this.inviteService.markUsed(input.token);

      // 5. Invite_Config → mission_progress 적용
      const configs = this.inviteConfigRepository.findByInviteId(invite.id);
      if (configs.length > 0) {
        const insertProgress = this.db.prepare(
          `INSERT INTO mission_progress (id, onboardee_id, mission_id, status, requirement, updated_at)
           VALUES (?, ?, ?, 'not_started', ?, datetime('now'))`
        );
        for (const config of configs) {
          insertProgress.run(uuidv4(), newUser.id, config.mission_id, config.requirement);
        }
      }

      return newUser;
    })();

    // JWT 발급
    const accessToken = this.generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
      },
      accessToken,
    };
  }

  /**
   * 로그인 — JWT 발급
   * Requirements: 1.4
   */
  async login(input: LoginInput): Promise<LoginResult> {
    const user = this.userRepository.findByEmail(input.email);
    if (!user) {
      throw new AuthError('INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const passwordMatch = await bcrypt.compare(input.password, user.password_hash);
    if (!passwordMatch) {
      throw new AuthError('INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    const accessToken = this.generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
      },
      accessToken,
    };
  }

  /**
   * JWT 토큰 검증
   */
  verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
      throw new AuthError('INVALID_TOKEN', '유효하지 않은 인증 토큰입니다.');
    }
  }

  private generateToken(user: User): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }
}

export class AuthError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}
