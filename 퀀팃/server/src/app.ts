import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabase } from './db.js';
import { UserRepository } from './repositories/UserRepository.js';
import { InviteRepository } from './repositories/InviteRepository.js';
import { InviteConfigRepository } from './repositories/InviteConfigRepository.js';
import { InviteService } from './services/InviteService.js';
import { AuthService } from './services/AuthService.js';
import { createAuthController } from './controllers/authController.js';
import { InviteConfigService } from './services/InviteConfigService.js';
import { createInviteController } from './controllers/inviteController.js';
import { IslandRepository } from './repositories/IslandRepository.js';
import { MissionRepository } from './repositories/MissionRepository.js';
import { MissionProgressRepository } from './repositories/MissionProgressRepository.js';
import { createIslandController } from './controllers/islandController.js';
import { createMissionController } from './controllers/missionController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize dependencies and routes
const db = getDatabase();
const userRepository = new UserRepository(db);
const inviteRepository = new InviteRepository(db);
const inviteConfigRepository = new InviteConfigRepository(db);
const inviteService = new InviteService(inviteRepository);
const inviteConfigService = new InviteConfigService(inviteConfigRepository, inviteRepository);
const authService = new AuthService(userRepository, inviteService, inviteConfigRepository, db);
const islandRepository = new IslandRepository(db);
const missionRepository = new MissionRepository(db);
const missionProgressRepository = new MissionProgressRepository(db);

app.use('/api/auth', createAuthController(authService));
app.use('/api/invites', createInviteController(inviteService, inviteConfigService));
app.use('/api/islands', createIslandController(islandRepository, missionRepository, missionProgressRepository));
app.use('/api/missions', createMissionController(missionRepository, missionProgressRepository));

export default app;
