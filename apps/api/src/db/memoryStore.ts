import { randomUUID } from 'node:crypto';
import type { AuthProvider, UserPlan } from '@apicaptain/types';
import type { BillingProviderId, SubscriptionStatusId } from '@apicaptain/config';

export type StoreUser = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  authProvider: AuthProvider;
  googleSub: string | null;
  plan: UserPlan;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};

export type StoreSession = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  userAgent: string | null;
  ipAddress: string | null;
};

export type StoreResetToken = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

export type StoreProject = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  sourceType: string;
  sourceContent: string | null;
  sourceMeta: unknown;
  openApiVersion: string | null;
  framework: string | null;
  library: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastGeneratedAt: Date | null;
};

export type StoreGeneration = {
  id: string;
  userId: string | null;
  projectId: string | null;
  sourceType: string;
  framework: string | null;
  language: string | null;
  library: string | null;
  endpointCount: number | null;
  status: 'SUCCESS' | 'FAILED';
  durationMs: number | null;
  metadata: unknown;
  createdAt: Date;
};

export type StoreUsage = {
  id: string;
  userId: string;
  period: string;
  generationCount: number;
};

export type StoreSubscription = {
  id: string;
  userId: string;
  plan: UserPlan;
  status: SubscriptionStatusId;
  provider: BillingProviderId;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  providerPlanId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StorePayment = {
  id: string;
  userId: string;
  subscriptionId: string | null;
  provider: BillingProviderId;
  providerPaymentId: string;
  providerOrderId: string | null;
  amount: number;
  currency: string;
  status: 'CREATED' | 'AUTHORIZED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';
  paymentMethod: string | null;
  invoiceUrl: string | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type StoreWebhookEvent = {
  id: string;
  provider: BillingProviderId;
  eventId: string;
  eventType: string;
  payloadHash: string;
  processed: boolean;
  processedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
};

/** In-memory SaaS store for tests / environments without DB access */
export class MemorySaasStore {
  users = new Map<string, StoreUser>();
  usersByEmail = new Map<string, string>();
  sessions = new Map<string, StoreSession>();
  sessionsByHash = new Map<string, string>();
  resets = new Map<string, StoreResetToken>();
  resetsByHash = new Map<string, string>();
  projects = new Map<string, StoreProject>();
  generations = new Map<string, StoreGeneration>();
  usage = new Map<string, StoreUsage>();
  subscriptions = new Map<string, StoreSubscription>();
  payments = new Map<string, StorePayment>();
  webhookEvents = new Map<string, StoreWebhookEvent>();

  reset(): void {
    this.users.clear();
    this.usersByEmail.clear();
    this.sessions.clear();
    this.sessionsByHash.clear();
    this.resets.clear();
    this.resetsByHash.clear();
    this.projects.clear();
    this.generations.clear();
    this.usage.clear();
    this.subscriptions.clear();
    this.payments.clear();
    this.webhookEvents.clear();
  }

  createUser(input: {
    email: string;
    name: string | null;
    passwordHash?: string | null;
    authProvider?: AuthProvider;
    googleSub?: string | null;
    plan?: UserPlan;
  }): StoreUser {
    const now = new Date();
    const user: StoreUser = {
      id: randomUUID(),
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash ?? null,
      authProvider: input.authProvider ?? 'email',
      googleSub: input.googleSub ?? null,
      plan: input.plan ?? 'FREE',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null,
    };
    this.users.set(user.id, user);
    this.usersByEmail.set(user.email, user.id);
    this.createSubscription({
      userId: user.id,
      plan: user.plan,
      status: 'INACTIVE',
      provider: 'NONE',
    });
    return user;
  }

  findUserByEmail(email: string): StoreUser | null {
    const id = this.usersByEmail.get(email);
    return id ? this.users.get(id) ?? null : null;
  }

  findUserById(id: string): StoreUser | null {
    return this.users.get(id) ?? null;
  }

  updateUser(id: string, patch: Partial<StoreUser>): StoreUser {
    const user = this.users.get(id);
    if (!user) throw new Error('USER_NOT_FOUND');
    const next = { ...user, ...patch, updatedAt: new Date() };
    this.users.set(id, next);
    if (patch.email && patch.email !== user.email) {
      this.usersByEmail.delete(user.email);
      this.usersByEmail.set(patch.email, id);
    }
    return next;
  }

  deleteUser(id: string): void {
    const user = this.users.get(id);
    if (!user) return;
    this.users.delete(id);
    this.usersByEmail.delete(user.email);
    for (const [sid, session] of this.sessions) {
      if (session.userId === id) {
        this.sessions.delete(sid);
        this.sessionsByHash.delete(session.tokenHash);
      }
    }
    for (const [pid, project] of [...this.projects]) {
      if (project.userId === id) this.projects.delete(pid);
    }
    for (const [gid, generation] of [...this.generations]) {
      if (generation.userId === id) this.generations.delete(gid);
    }
    for (const [uid, usage] of [...this.usage]) {
      if (usage.userId === id) this.usage.delete(uid);
    }
    for (const [sid, subscription] of [...this.subscriptions]) {
      if (subscription.userId === id) this.subscriptions.delete(sid);
    }
    for (const [pid, payment] of [...this.payments]) {
      if (payment.userId === id) this.payments.delete(pid);
    }
    for (const [rid, reset] of [...this.resets]) {
      if (reset.userId === id) {
        this.resets.delete(rid);
        this.resetsByHash.delete(reset.tokenHash);
      }
    }
  }

  createSession(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string | null;
    ipAddress?: string | null;
  }): StoreSession {
    const session: StoreSession = {
      id: randomUUID(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      createdAt: new Date(),
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
    };
    this.sessions.set(session.id, session);
    this.sessionsByHash.set(session.tokenHash, session.id);
    return session;
  }

  findSessionByHash(tokenHash: string): StoreSession | null {
    const id = this.sessionsByHash.get(tokenHash);
    return id ? this.sessions.get(id) ?? null : null;
  }

  deleteSessionByHash(tokenHash: string): void {
    const id = this.sessionsByHash.get(tokenHash);
    if (!id) return;
    this.sessions.delete(id);
    this.sessionsByHash.delete(tokenHash);
  }

  deleteSessionsForUser(userId: string): void {
    for (const [sid, session] of [...this.sessions]) {
      if (session.userId === userId) {
        this.sessions.delete(sid);
        this.sessionsByHash.delete(session.tokenHash);
      }
    }
  }

  createResetToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): StoreResetToken {
    const token: StoreResetToken = {
      id: randomUUID(),
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      usedAt: null,
      createdAt: new Date(),
    };
    this.resets.set(token.id, token);
    this.resetsByHash.set(token.tokenHash, token.id);
    return token;
  }

  findResetByHash(tokenHash: string): StoreResetToken | null {
    const id = this.resetsByHash.get(tokenHash);
    return id ? this.resets.get(id) ?? null : null;
  }

  markResetUsed(id: string): void {
    const token = this.resets.get(id);
    if (!token) return;
    this.resets.set(id, { ...token, usedAt: new Date() });
  }

  createProject(input: Omit<StoreProject, 'id' | 'createdAt' | 'updatedAt' | 'lastGeneratedAt'> & {
    lastGeneratedAt?: Date | null;
  }): StoreProject {
    const now = new Date();
    const project: StoreProject = {
      id: randomUUID(),
      ...input,
      lastGeneratedAt: input.lastGeneratedAt ?? null,
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(project.id, project);
    return project;
  }

  listProjects(userId: string): StoreProject[] {
    return [...this.projects.values()]
      .filter((project) => project.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  findProject(userId: string, projectId: string): StoreProject | null {
    const project = this.projects.get(projectId);
    if (!project || project.userId !== userId) return null;
    return project;
  }

  updateProject(userId: string, projectId: string, patch: Partial<StoreProject>): StoreProject | null {
    const project = this.findProject(userId, projectId);
    if (!project) return null;
    const next = { ...project, ...patch, id: project.id, userId: project.userId, updatedAt: new Date() };
    this.projects.set(projectId, next);
    return next;
  }

  deleteProject(userId: string, projectId: string): boolean {
    const project = this.findProject(userId, projectId);
    if (!project) return false;
    this.projects.delete(projectId);
    for (const [gid, generation] of [...this.generations]) {
      if (generation.projectId === projectId) this.generations.delete(gid);
    }
    return true;
  }

  countProjects(userId: string): number {
    return [...this.projects.values()].filter((project) => project.userId === userId).length;
  }

  createGeneration(input: Omit<StoreGeneration, 'id' | 'createdAt'>): StoreGeneration {
    const generation: StoreGeneration = {
      id: randomUUID(),
      ...input,
      createdAt: new Date(),
    };
    this.generations.set(generation.id, generation);
    return generation;
  }

  listGenerationsForProject(userId: string, projectId: string): StoreGeneration[] {
    return [...this.generations.values()]
      .filter((item) => item.userId === userId && item.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  listRecentGenerations(userId: string, limit = 5): StoreGeneration[] {
    return [...this.generations.values()]
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  getOrCreateUsage(userId: string, period: string): StoreUsage {
    const key = `${userId}:${period}`;
    const existing = this.usage.get(key);
    if (existing) return existing;
    const record: StoreUsage = {
      id: randomUUID(),
      userId,
      period,
      generationCount: 0,
    };
    this.usage.set(key, record);
    return record;
  }

  incrementUsage(userId: string, period: string): StoreUsage {
    const record = this.getOrCreateUsage(userId, period);
    const next = { ...record, generationCount: record.generationCount + 1 };
    this.usage.set(`${userId}:${period}`, next);
    return next;
  }

  listSubscriptions(userId: string): StoreSubscription[] {
    return [...this.subscriptions.values()]
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  getLatestSubscription(userId: string): StoreSubscription | null {
    return this.listSubscriptions(userId)[0] ?? null;
  }

  findSubscriptionById(id: string): StoreSubscription | null {
    return this.subscriptions.get(id) ?? null;
  }

  findSubscriptionByProviderId(
    provider: BillingProviderId,
    providerSubscriptionId: string,
  ): StoreSubscription | null {
    return (
      [...this.subscriptions.values()].find(
        (item) =>
          item.provider === provider && item.providerSubscriptionId === providerSubscriptionId,
      ) ?? null
    );
  }

  findSubscriptionByCustomerId(
    provider: BillingProviderId,
    providerCustomerId: string,
  ): StoreSubscription | null {
    return (
      [...this.subscriptions.values()].find(
        (item) => item.provider === provider && item.providerCustomerId === providerCustomerId,
      ) ?? null
    );
  }

  createSubscription(
    input: Omit<
      StoreSubscription,
      | 'id'
      | 'createdAt'
      | 'updatedAt'
      | 'cancelAtPeriodEnd'
      | 'cancelledAt'
      | 'providerCustomerId'
      | 'providerSubscriptionId'
      | 'providerPlanId'
      | 'currentPeriodStart'
      | 'currentPeriodEnd'
    > & {
      cancelAtPeriodEnd?: boolean;
      cancelledAt?: Date | null;
      providerCustomerId?: string | null;
      providerSubscriptionId?: string | null;
      providerPlanId?: string | null;
      currentPeriodStart?: Date | null;
      currentPeriodEnd?: Date | null;
    },
  ): StoreSubscription {
    const now = new Date();
    const subscription: StoreSubscription = {
      providerCustomerId: input.providerCustomerId ?? null,
      providerSubscriptionId: input.providerSubscriptionId ?? null,
      providerPlanId: input.providerPlanId ?? null,
      currentPeriodStart: input.currentPeriodStart ?? null,
      currentPeriodEnd: input.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
      cancelledAt: input.cancelledAt ?? null,
      userId: input.userId,
      plan: input.plan,
      status: input.status,
      provider: input.provider,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  updateSubscription(id: string, patch: Partial<StoreSubscription>): StoreSubscription {
    const current = this.subscriptions.get(id);
    if (!current) throw new Error('SUBSCRIPTION_NOT_FOUND');
    const next = { ...current, ...patch, id: current.id, userId: current.userId, updatedAt: new Date() };
    this.subscriptions.set(id, next);
    return next;
  }

  upsertPayment(
    input: Omit<StorePayment, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ): StorePayment {
    const existing = [...this.payments.values()].find(
      (item) => item.provider === input.provider && item.providerPaymentId === input.providerPaymentId,
    );
    const now = new Date();
    if (existing) {
      const next = { ...existing, ...input, id: existing.id, createdAt: existing.createdAt, updatedAt: now };
      this.payments.set(existing.id, next);
      return next;
    }
    const payment: StorePayment = {
      ...input,
      id: input.id ?? randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.payments.set(payment.id, payment);
    return payment;
  }

  listPayments(userId: string): StorePayment[] {
    return [...this.payments.values()]
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  webhookKey(provider: BillingProviderId, eventId: string): string {
    return `${provider}:${eventId}`;
  }

  getWebhookEvent(provider: BillingProviderId, eventId: string): StoreWebhookEvent | null {
    return this.webhookEvents.get(this.webhookKey(provider, eventId)) ?? null;
  }

  createWebhookEvent(input: Omit<StoreWebhookEvent, 'id' | 'createdAt'>): StoreWebhookEvent {
    const event: StoreWebhookEvent = {
      ...input,
      id: randomUUID(),
      createdAt: new Date(),
    };
    this.webhookEvents.set(this.webhookKey(event.provider, event.eventId), event);
    return event;
  }

  updateWebhookEvent(provider: BillingProviderId, eventId: string, patch: Partial<StoreWebhookEvent>): StoreWebhookEvent {
    const current = this.getWebhookEvent(provider, eventId);
    if (!current) throw new Error('WEBHOOK_NOT_FOUND');
    const next = { ...current, ...patch, id: current.id };
    this.webhookEvents.set(this.webhookKey(provider, eventId), next);
    return next;
  }
}

export const memoryStore = new MemorySaasStore();

export const useMemoryStore = (): boolean =>
  process.env.SAAS_STORE === 'memory' || process.env.NODE_ENV === 'test';
