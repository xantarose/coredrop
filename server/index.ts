import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { doubleCsrf } from 'csrf-csrf';
import { initDatabase } from './database/init';
import { initTelegramBot, stopTelegramBot } from './services/telegram-bot';
import authRoutes from './routes/auth';
import verify2faRoutes from './routes/verify2fa';
import profileRoutes from './routes/profile';
import filesRoutes from './routes/files';
import uploadRoutes from './routes/upload';
import previewRoutes from './routes/preview';
import shareRoutes from './routes/share';
import downloadRoutes from './routes/download';
import foldersRoutes from './routes/folders';
import dashboardRoutes from './routes/dashboard';
import securityRoutes from './routes/security';
import accountRoutes from './routes/account';
import adminRoutes from './routes/admin';
import { generalRateLimiter } from './middleware/rateLimiter';
import pool from './database/init';

dotenv.config();

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app: Express = express();
const PORT = parseInt(process.env.SERVER_PORT!);
const CLIENT_URL = process.env.CLIENT_URL!;

app.set('trust proxy', 1);

app.use((req: Request, res: Response, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req: Request, res: Response) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

let doubleCsrfProtection = (req: Request, res: Response, next: any) => next();
let generateToken = (req: Request, res: Response) => 'token';

const csrfSecret = process.env.CSRF_SECRET || 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0';
const csrf = doubleCsrf({
  getSecret: () => csrfSecret,
  cookieName: process.env.NODE_ENV === 'production' ? '__Host-csrf-token' : 'csrf-token',
  cookieOptions: {
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true
  },
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS']
});
doubleCsrfProtection = csrf.doubleCsrfProtection;
generateToken = csrf.generateToken;

app.use('/api', generalRateLimiter);

app.get('/api/csrf-token', (req: Request, res: Response) => {
  const token = generateToken(req, res);
  res.json({ token });
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/auth', verify2faRoutes);
app.use('/api/auth/profile', profileRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/preview', previewRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/download', downloadRoutes);
app.use('/api/folders', foldersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const startServer = async () => {
  try {
    console.log('Инициализация базы данных...');
    await initDatabase();
    console.log('База данных успешно инициализирована');

    app.set('db', pool);

    initTelegramBot();

    app.listen(PORT, () => {
      console.log('');
      console.log('===================================');
      console.log('API сервер успешно запущен');
      console.log(`Сервер работает на: http://localhost:${PORT}`);
      console.log(`URL клиента: ${CLIENT_URL}`);
      console.log('Статус: готов к обработке запросов');
      console.log('===================================');
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  console.log('Остановка сервера...');
  stopTelegramBot();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Остановка сервера...');
  stopTelegramBot();
  process.exit(0);
});

startServer();

export default app;
