import { Router, Request, Response } from 'express';
import { MissionRepository } from '../repositories/MissionRepository.js';
import { MissionProgressRepository } from '../repositories/MissionProgressRepository.js';
import { authenticate } from '../middleware/auth.js';

export function createMissionController(
  missionRepo: MissionRepository,
  progressRepo: MissionProgressRepository
): Router {
  const router = Router();

  // GET /api/missions/:id — 미션 상세 (content 포함)
  router.get('/:id', authenticate, (req: Request, res: Response) => {
    try {
      const mission = missionRepo.getById(req.params.id);
      if (!mission) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: '미션을 찾을 수 없습니다.' } });
        return;
      }

      const userId = req.user!.userId;
      const progress = progressRepo.getByOnboardeeAndMission(userId, mission.id);

      res.json({
        ...mission,
        content: mission.content ? JSON.parse(mission.content) : null,
        progress: progress ? {
          status: progress.status,
          requirement: progress.requirement,
          progress_data: progress.progress_data ? JSON.parse(progress.progress_data) : null,
          started_at: progress.started_at,
          completed_at: progress.completed_at,
        } : null,
      });
    } catch (err) {
      console.error('Mission detail error:', err);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } });
    }
  });

  // POST /api/missions/:id/start — 미션 시작
  router.post('/:id/start', authenticate, (req: Request, res: Response) => {
    try {
      const mission = missionRepo.getById(req.params.id);
      if (!mission) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: '미션을 찾을 수 없습니다.' } });
        return;
      }

      const userId = req.user!.userId;
      const existing = progressRepo.getByOnboardeeAndMission(userId, mission.id);

      if (existing && existing.status === 'completed') {
        res.status(400).json({ error: { code: 'ALREADY_COMPLETED', message: '이미 완료된 미션입니다.' } });
        return;
      }

      const progress = progressRepo.upsert(userId, mission.id, 'in_progress');
      res.json({ status: progress.status, started_at: progress.started_at });
    } catch (err) {
      console.error('Mission start error:', err);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } });
    }
  });

  // POST /api/missions/:id/complete — 미션 완료
  router.post('/:id/complete', authenticate, (req: Request, res: Response) => {
    try {
      const mission = missionRepo.getById(req.params.id);
      if (!mission) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: '미션을 찾을 수 없습니다.' } });
        return;
      }

      const userId = req.user!.userId;
      const progress = progressRepo.upsert(userId, mission.id, 'completed');
      res.json({ status: progress.status, completed_at: progress.completed_at });
    } catch (err) {
      console.error('Mission complete error:', err);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } });
    }
  });

  // PUT /api/missions/:id/progress — 진행 상태 업데이트
  router.put('/:id/progress', authenticate, (req: Request, res: Response) => {
    try {
      const mission = missionRepo.getById(req.params.id);
      if (!mission) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: '미션을 찾을 수 없습니다.' } });
        return;
      }

      const userId = req.user!.userId;
      const { progress_data } = req.body;
      const progress = progressRepo.upsert(userId, mission.id, 'in_progress', JSON.stringify(progress_data));
      res.json({
        status: progress.status,
        progress_data: progress.progress_data ? JSON.parse(progress.progress_data) : null,
      });
    } catch (err) {
      console.error('Mission progress update error:', err);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } });
    }
  });

  return router;
}
