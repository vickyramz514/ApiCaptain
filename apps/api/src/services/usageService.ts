import {
  currentUsagePeriod,
  getPlanLimits,
  isUnlimitedGenerations,
  isUnlimitedProjects,
  type UserPlanId,
} from '@apicaptain/config';
import { AppError } from '../utils/errors.js';
import { memoryStore, useMemoryStore } from '../db/memoryStore.js';
import { prisma } from '../db/prisma.js';

export const assertCanCreateProject = async (userId: string, plan: UserPlanId): Promise<void> => {
  if (isUnlimitedProjects(plan)) return;
  const limits = getPlanLimits(plan);
  const count = useMemoryStore()
    ? memoryStore.countProjects(userId)
    : await prisma.project.count({ where: { userId } });
  if (limits.projects !== null && count >= limits.projects) {
    throw new AppError(
      'PLAN_LIMIT_REACHED',
      `Free plan allows up to ${limits.projects} saved projects. Upgrade to Pro for unlimited projects.`,
      403,
    );
  }
};

export const getUsageSnapshot = async (userId: string, plan: UserPlanId) => {
  const period = currentUsagePeriod();
  const limits = getPlanLimits(plan);
  const generationCount = useMemoryStore()
    ? memoryStore.getOrCreateUsage(userId, period).generationCount
    : (
        await prisma.usageRecord.upsert({
          where: { userId_period: { userId, period } },
          create: { userId, period, generationCount: 0 },
          update: {},
        })
      ).generationCount;

  const projectCount = useMemoryStore()
    ? memoryStore.countProjects(userId)
    : await prisma.project.count({ where: { userId } });

  return {
    period,
    generationCount,
    generationLimit: limits.generationsPerMonth,
    projectCount,
    projectLimit: limits.projects,
  };
};

export const assertCanGenerate = async (userId: string, plan: UserPlanId): Promise<void> => {
  if (isUnlimitedGenerations(plan)) return;
  const usage = await getUsageSnapshot(userId, plan);
  if (usage.generationLimit !== null && usage.generationCount >= usage.generationLimit) {
    throw new AppError(
      'USAGE_LIMIT_REACHED',
      'You have reached your monthly generation limit.',
      403,
      { period: usage.period, limit: usage.generationLimit },
    );
  }
};

export const recordSuccessfulGeneration = async (userId: string): Promise<void> => {
  const period = currentUsagePeriod();
  if (useMemoryStore()) {
    memoryStore.incrementUsage(userId, period);
    return;
  }
  await prisma.usageRecord.upsert({
    where: { userId_period: { userId, period } },
    create: { userId, period, generationCount: 1 },
    update: { generationCount: { increment: 1 } },
  });
};
