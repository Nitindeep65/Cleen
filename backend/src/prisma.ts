import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export const useMemoryStore = process.env.NODE_ENV === 'test' || process.env.CLEEN_USE_MEMORY === 'true';
