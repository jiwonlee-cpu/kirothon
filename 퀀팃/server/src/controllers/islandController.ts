import { Router, Request, Response } from 'express';
import { IslandRepository } from '../repositories/IslandRepository.js';
import { MissionRepository } from '../repositories/MissionRepository.js';
import { MissionProgressRepository } from '../repositories/MissionProgressRepository.js';
import { authenticate } from '../middleware/auth.js';

export function createIslandController(
  islandRepo: IslandRepository,
  missionRepo: MissionRepository,
  progressRepo: MissionProgressRepository
): Router {
  const router = Router();

  // GET /api/islands — Island 목록
  router.get('/', authenticate, (req: Request, res: Response) => {
    try {
      const islands = islandRepo.getAll();
      const userId = req.user!.userId;
      const allProgress = progressRepo.getByOnboardee(userId);

      const result = islands.map((island) => {
        const missions = missionRepo.getByIslandId(island.id);
        const missionIds = missions.map((m) => m.id);
        const progress = allProgress.filter((p) => missionIds.includes(p.mission_id));
        const requiredProgress = progress.filter((p) => p.requirement === 'required');
        const completedRequired = requiredProgress.filter((p) => p.status === 'completed');
        const totalCompleted = progress.filter((p) => p.status === 'completed');

        return {
          ...island,
          missionCount: missions.length,
          requiredCount: requiredProgress.length,
          completedRequiredCount: completedRequired.length,
          completedCount: totalCompleted.length,
          isCompleted: requiredProgress.length > 0 && completedRequired.length === requiredProgress.length,
        };
      });

      res.json(result);
    } catch (err) {
      console.error('Island list error:', err);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } });
    }
  });

  // GET /api/islands/:id/missions — Island별 미션 목록 + 진행 상태
  router.get('/:id/missions', authenticate, (req: Request, res: Response) => {
    try {
      const island = islandRepo.getById(req.params.id as string);
      if (!island) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: '섬을 찾을 수 없습니다.' } });
        return;
      }

      const missions = missionRepo.getByIslandId(island.id);
      const userId = req.user!.userId;

      const result = missions.map((mission) => {
        const progress = progressRepo.getByOnboardeeAndMission(userId, mission.id);
        return {
          id: mission.id,
          title: mission.title,
          description: mission.description,
          type: mission.type,
          sort_order: mission.sort_order,
          status: progress?.status ?? 'not_started',
          requirement: progress?.requirement ?? 'optional',
        };
      });

      res.json({ island, missions: result });
    } catch (err) {
      console.error('Island missions error:', err);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } });
    }
  });

  return router;
}
