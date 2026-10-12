import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { randomUUID } from "node:crypto";
import { prisma } from "@vaultstream/database";
import { verifyAccessToken, type AuthenticatedPrincipal } from "@vaultstream/auth";
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
const cookieName = "vaultstream_session";
async function principal(req: Request): Promise<AuthenticatedPrincipal> {
  const token = req.cookies?.[cookieName];
  if (!token) throw new ForbiddenException("Sign in required");
  const payload = await verifyAccessToken(token);
  const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { id: true, email: true, role: true, status: true } });
  if (!user || user.status !== "ACTIVE") throw new ForbiddenException("Account is not active");
  return { id: user.id, email: user.email, role: user.role as AuthenticatedPrincipal["role"] };
}
function staff(p: AuthenticatedPrincipal) { if (p.role === "USER") throw new ForbiddenException("Admin access required"); }
function admin(p: AuthenticatedPrincipal) { if (p.role !== "ADMIN") throw new ForbiddenException("Only admins can perform this action"); }
function text(value: unknown, max: number, field: string, required = false) {
  const s = String(value ?? "").trim();
  if (required && !s) throw new BadRequestException(field + " is required");
  if (s.length > max) throw new BadRequestException(field + " is too long");
  return s;
}
function slug(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || randomUUID(); }
async function audit(actorId: string, action: string, entity: string, entityId?: string, metadata?: unknown) {
  await prisma.auditLog.create({ data: { actorId, action, entity, entityId: entityId ?? null, metadata: (metadata ?? {}) as any } });
}
async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.platformMetadata.findUnique({ where: { key } });
  if (!row) return fallback;
  try { return JSON.parse(row.value) as T; } catch { return fallback; }
}
async function putSetting(key: string, value: unknown) {
  return prisma.platformMetadata.upsert({ where: { key }, create: { key, value: JSON.stringify(value) }, update: { value: JSON.stringify(value) } });
}

@Controller("v1/admin")
export class AdminFeaturesController {
  @Get("pages")
  async pages(@Req() req: Request, @Query() q: any) {
    const p = await principal(req); staff(p);
    const where: any = {};
    if (q.kind && ["PAGE", "POST"].includes(q.kind)) where.kind = q.kind;
    if (q.status && ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(q.status)) where.status = q.status;
    return { data: await prisma.contentPage.findMany({ where, orderBy: { updatedAt: "desc" }, take: 500 }) };
  }
  @Post("pages")
  async createPage(@Req() req: Request, @Body() b: any) {
    const p = await principal(req); staff(p);
    const title = text(b.title, 180, "Title", true);
    const body = text(b.body, 100000, "Body");
    const kind = b.kind === "POST" ? "POST" : "PAGE";
    const status = ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(b.status) ? b.status : "DRAFT";
    const base = slug(text(b.slug || title, 180, "Slug", true));
    let item;
    try { item = await prisma.contentPage.create({ data: { title, slug: base, kind: kind as any, excerpt: text(b.excerpt, 500, "Excerpt") || null, body, status: status as any, authorId: p.id, publishedAt: status === "PUBLISHED" ? new Date() : null } }); }
    catch (e: any) { if (e?.code === "P2002") throw new BadRequestException("That page slug already exists"); throw e; }
    await audit(p.id, "content.create", "ContentPage", item.id, { title, kind, status });
    return { data: item };
  }
  @Patch("pages/:id")
  async updatePage(@Req() req: Request, @Param("id") id: string, @Body() b: any) {
    const p = await principal(req); staff(p);
    const data: any = {};
    if (b.title !== undefined) data.title = text(b.title, 180, "Title", true);
    if (b.slug !== undefined) data.slug = slug(text(b.slug, 180, "Slug", true));
    if (b.excerpt !== undefined) data.excerpt = text(b.excerpt, 500, "Excerpt") || null;
    if (b.body !== undefined) data.body = text(b.body, 100000, "Body");
    if (b.kind !== undefined) { if (!["PAGE", "POST"].includes(b.kind)) throw new BadRequestException("Invalid content kind"); data.kind = b.kind; }
    if (b.status !== undefined) { if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(b.status)) throw new BadRequestException("Invalid content status"); data.status = b.status; data.publishedAt = b.status === "PUBLISHED" ? new Date() : null; }
    if (!Object.keys(data).length) throw new BadRequestException("No changes provided");
    try {
      const item = await prisma.contentPage.update({ where: { id }, data });
      await audit(p.id, "content.update", "ContentPage", id, { fields: Object.keys(data) });
      return { data: item };
    } catch (e: any) { if (e?.code === "P2025") throw new NotFoundException("Content not found"); if (e?.code === "P2002") throw new BadRequestException("That slug already exists"); throw e; }
  }
  @Delete("pages/:id")
  async deletePage(@Req() req: Request, @Param("id") id: string) {
    const p = await principal(req); staff(p);
    try { await prisma.contentPage.delete({ where: { id } }); await audit(p.id, "content.delete", "ContentPage", id); return { data: { ok: true } }; }
    catch (e: any) { if (e?.code === "P2025") throw new NotFoundException("Content not found"); throw e; }
  }

  @Get("comments")
  async comments(@Req() req: Request, @Query() q: any) {
    const p = await principal(req); staff(p);
    const where: any = {};
    if (q.status && ["PENDING", "APPROVED", "HIDDEN"].includes(q.status)) where.status = q.status;
    if (q.videoId) where.videoId = String(q.videoId);
    return { data: await prisma.comment.findMany({ where, include: { user: { select: { id: true, name: true, email: true } }, video: { select: { id: true, title: true, slug: true } } }, orderBy: { createdAt: "desc" }, take: 500 }) };
  }
  @Patch("comments/:id")
  async moderateComment(@Req() req: Request, @Param("id") id: string, @Body() b: any) {
    const p = await principal(req); staff(p);
    if (!["PENDING", "APPROVED", "HIDDEN"].includes(b.status)) throw new BadRequestException("Invalid comment status");
    try { const item = await prisma.comment.update({ where: { id }, data: { status: b.status } }); await audit(p.id, "comment.moderate", "Comment", id, { status: b.status }); return { data: item }; }
    catch (e: any) { if (e?.code === "P2025") throw new NotFoundException("Comment not found"); throw e; }
  }
  @Delete("comments/:id")
  async deleteComment(@Req() req: Request, @Param("id") id: string) {
    const p = await principal(req); staff(p);
    try { await prisma.comment.delete({ where: { id } }); await audit(p.id, "comment.delete", "Comment", id); return { data: { ok: true } }; }
    catch (e: any) { if (e?.code === "P2025") throw new NotFoundException("Comment not found"); throw e; }
  }

  @Get("playlists")
  async playlists(@Req() req: Request) {
    const p = await principal(req); staff(p);
    return { data: await prisma.playlist.findMany({ include: { user: { select: { id: true, name: true, email: true } }, items: { include: { video: { select: { id: true, title: true, status: true } } } } }, orderBy: { updatedAt: "desc" }, take: 500 }) };
  }
  @Patch("playlists/:id")
  async updatePlaylist(@Req() req: Request, @Param("id") id: string, @Body() b: any) {
    const p = await principal(req); staff(p);
    const data: any = {};
    if (b.isPublic !== undefined) { if (typeof b.isPublic !== "boolean") throw new BadRequestException("isPublic must be true or false"); data.isPublic = b.isPublic; }
    if (b.name !== undefined) data.name = text(b.name, 120, "Playlist name", true);
    if (!Object.keys(data).length) throw new BadRequestException("No changes provided");
    try { const item = await prisma.playlist.update({ where: { id }, data }); await audit(p.id, "playlist.update", "Playlist", id, { fields: Object.keys(data) }); return { data: item }; }
    catch (e: any) { if (e?.code === "P2025") throw new NotFoundException("Playlist not found"); throw e; }
  }
  @Delete("playlists/:id")
  async deletePlaylist(@Req() req: Request, @Param("id") id: string) {
    const p = await principal(req); staff(p);
    try { await prisma.playlist.delete({ where: { id } }); await audit(p.id, "playlist.delete", "Playlist", id); return { data: { ok: true } }; }
    catch (e: any) { if (e?.code === "P2025") throw new NotFoundException("Playlist not found"); throw e; }
  }

  @Get("roles")
  async roles(@Req() req: Request) {
    const p = await principal(req); staff(p);
    return { data: [
      { role: "USER", description: "Standard account", permissions: ["view_public_videos", "manage_own_profile", "manage_own_playlists", "like_videos", "comment"] },
      { role: "MODERATOR", description: "Content and community moderation", permissions: ["view_public_videos", "manage_own_profile", "manage_videos", "manage_categories", "manage_tags", "moderate_comments", "view_analytics", "view_audit_logs"] },
      { role: "ADMIN", description: "Full platform administration", permissions: ["*"] }
    ], note: "Role assignments are managed in User Management. Built-in permissions are fixed by server policy." };
  }

  @Get("subscriptions")
  async subscriptions(@Req() req: Request, @Query() q: any) {
    const p = await principal(req); staff(p);
    const where: any = {};
    if (q.status && ["ACTIVE", "CANCELLED", "EXPIRED", "PAST_DUE"].includes(q.status)) where.status = q.status;
    return { data: await prisma.subscription.findMany({ where, include: { user: { select: { id: true, name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 500 }) };
  }
  @Post("subscriptions")
  async createSubscription(@Req() req: Request, @Body() b: any) {
    const p = await principal(req); admin(p);
    const userId = text(b.userId, 100, "User ID", true);
    const planName = text(b.planName, 100, "Plan name", true);
    const amountCents = Number(b.amountCents);
    if (!Number.isSafeInteger(amountCents) || amountCents < 0 || amountCents > 100000000) throw new BadRequestException("amountCents must be a non-negative integer");
    const currency = text(b.currency || "USD", 3, "Currency", true).toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new BadRequestException("Currency must be a three-letter code");
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException("User not found");
    const item = await prisma.subscription.create({ data: { userId, planName, amountCents, currency, status: "ACTIVE", provider: text(b.provider || "MANUAL", 40, "Provider") } });
    await audit(p.id, "subscription.create", "Subscription", item.id, { planName, amountCents, currency });
    return { data: item };
  }
  @Patch("subscriptions/:id")
  async updateSubscription(@Req() req: Request, @Param("id") id: string, @Body() b: any) {
    const p = await principal(req); admin(p);
    const data: any = {};
    if (b.status !== undefined) { if (!["ACTIVE", "CANCELLED", "EXPIRED", "PAST_DUE"].includes(b.status)) throw new BadRequestException("Invalid subscription status"); data.status = b.status; }
    if (b.endsAt !== undefined) { const d = b.endsAt ? new Date(b.endsAt) : null; if (d && !Number.isFinite(d.getTime())) throw new BadRequestException("Invalid end date"); data.endsAt = d; }
    if (b.planName !== undefined) data.planName = text(b.planName, 100, "Plan name", true);
    if (b.amountCents !== undefined) { const n = Number(b.amountCents); if (!Number.isSafeInteger(n) || n < 0) throw new BadRequestException("Invalid amountCents"); data.amountCents = n; }
    if (!Object.keys(data).length) throw new BadRequestException("No changes provided");
    try { const item = await prisma.subscription.update({ where: { id }, data }); await audit(p.id, "subscription.update", "Subscription", id, { fields: Object.keys(data) }); return { data: item }; }
    catch (e: any) { if (e?.code === "P2025") throw new NotFoundException("Subscription not found"); throw e; }
  }

  @Get("analytics")
  async analytics(@Req() req: Request) {
    const p = await principal(req); staff(p);
    const since = new Date(Date.now() - 30 * 86400000);
    const [users, videos, jobs, ads, histories, recentUsers, recentVideos, topVideos] = await Promise.all([
      prisma.user.count(), prisma.video.count(), prisma.videoJob.count(), prisma.advertisement.aggregate({ _sum: { impressions: true, clicks: true } }),
      prisma.watchHistory.findMany({ where: { watchedAt: { gte: since } }, select: { watchedAt: true }, take: 10000 }),
      prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true }, take: 10000 }),
      prisma.video.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true }, take: 10000 }),
      prisma.video.findMany({ orderBy: { views: "desc" }, take: 10, select: { id: true, title: true, views: true, likesCount: true, status: true } })
    ]);
    const daily = (items: Array<{ createdAt?: Date; watchedAt?: Date }>, field: "createdAt" | "watchedAt") => {
      const counts: Record<string, number> = {};
      for (const item of items) { const d = item[field]; if (d) { const key = d.toISOString().slice(0, 10); counts[key] = (counts[key] || 0) + 1; } }
      return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
    };
    return { data: { periodDays: 30, totals: { users, videos, processingJobs: jobs, adImpressions: Number(ads._sum.impressions || 0), adClicks: Number(ads._sum.clicks || 0) }, dailySignups: daily(recentUsers, "createdAt"), dailyUploads: daily(recentVideos, "createdAt"), dailyWatchHistory: daily(histories, "watchedAt"), topVideos: topVideos.map((v: any) => ({ ...v, views: Number(v.views) })) } };
  }

  @Get("revenue")
  async revenue(@Req() req: Request) {
    const p = await principal(req); staff(p);
    const [ads, subscriptions] = await Promise.all([
      prisma.advertisement.findMany({ select: { id: true, name: true, status: true, provider: true, impressions: true, clicks: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 500 }),
      prisma.subscription.findMany({ select: { id: true, planName: true, status: true, amountCents: true, currency: true, createdAt: true, endsAt: true }, orderBy: { createdAt: "desc" }, take: 1000 })
    ]);
    const active = subscriptions.filter((s: any) => s.status === "ACTIVE");
    const totalsByCurrency: Record<string, number> = {};
    for (const s of active) totalsByCurrency[s.currency] = (totalsByCurrency[s.currency] || 0) + s.amountCents;
    return { data: { note: "Subscription totals are recorded plan values, not verified payment-provider settlements. Ad revenue requires a configured provider report.", activeSubscriptions: active.length, subscriptionValueCentsByCurrency: totalsByCurrency, ads: ads.map((a: any) => ({ ...a, impressions: Number(a.impressions), clicks: Number(a.clicks) })), subscriptions } };
  }

  @Get("processing")
  async processing(@Req() req: Request) {
    const p = await principal(req); staff(p);
    return { data: await prisma.videoJob.findMany({ include: { video: { select: { id: true, title: true, status: true, createdAt: true } } }, orderBy: { createdAt: "desc" }, take: 500 }) };
  }
  @Post("processing/:id/retry")
  async retryProcessing(@Req() req: Request, @Param("id") id: string) {
    const p = await principal(req); admin(p);
    const job = await prisma.videoJob.findUnique({ where: { id }, include: { video: true } });
    if (!job) throw new NotFoundException("Processing job not found");
    if (!job.video.sourceKey) throw new BadRequestException("Source file is missing; this job cannot be retried");
    if (job.status === "PROCESSING") throw new BadRequestException("This job is already processing");
    await prisma.$transaction([
      prisma.videoJob.update({ where: { id }, data: { status: "QUEUED", progress: 0, error: null, attempts: { increment: 1 }, startedAt: null, finishedAt: null } }),
      prisma.video.update({ where: { id: job.videoId }, data: { status: "UPLOADING" } })
    ]);
    await redis.lpush("vaultstream:video-jobs", job.videoId);
    await audit(p.id, "processing.retry", "VideoJob", id, { videoId: job.videoId });
    return { data: { ok: true, jobId: id, videoId: job.videoId } };
  }

  @Get("settings")
  async settings(@Req() req: Request) {
    const p = await principal(req); admin(p);
    return { data: await getSetting("admin:system-settings", { siteName: "YourTab", supportEmail: "", maintenanceMode: false, allowComments: true, defaultVisibility: "PUBLIC", maxUploadMb: 2048, defaultTheme: "dark" }) };
  }
  @Patch("settings")
  async updateSettings(@Req() req: Request, @Body() b: any) {
    const p = await principal(req); admin(p);
    const current: any = await getSetting("admin:system-settings", { siteName: "YourTab", supportEmail: "", maintenanceMode: false, allowComments: true, defaultVisibility: "PUBLIC", maxUploadMb: 2048, defaultTheme: "dark" });
    if (b.siteName !== undefined) current.siteName = text(b.siteName, 80, "Site name", true);
    if (b.supportEmail !== undefined) { const email = text(b.supportEmail, 254, "Support email"); if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException("Invalid support email"); current.supportEmail = email; }
    for (const key of ["maintenanceMode", "allowComments"]) if (b[key] !== undefined) { if (typeof b[key] !== "boolean") throw new BadRequestException(key + " must be true or false"); current[key] = b[key]; }
    if (b.defaultVisibility !== undefined) { if (!["PUBLIC", "UNLISTED", "PRIVATE"].includes(b.defaultVisibility)) throw new BadRequestException("Invalid default visibility"); current.defaultVisibility = b.defaultVisibility; }
    if (b.maxUploadMb !== undefined) { const n = Number(b.maxUploadMb); if (!Number.isInteger(n) || n < 1 || n > 20480) throw new BadRequestException("maxUploadMb must be between 1 and 20480"); current.maxUploadMb = n; }
    if (b.defaultTheme !== undefined) { if (!["dark", "light", "system"].includes(b.defaultTheme)) throw new BadRequestException("Invalid theme"); current.defaultTheme = b.defaultTheme; }
    await putSetting("admin:system-settings", current); await audit(p.id, "settings.update", "PlatformMetadata", "admin:system-settings", { fields: Object.keys(b) });
    return { data: current };
  }

  @Get("website")
  async website(@Req() req: Request) {
    const p = await principal(req); staff(p);
    return { data: await getSetting("admin:website-content", { heroTitle: "Your videos, your world.", heroSubtitle: "Watch and share videos on YourTab.", aboutText: "", footerText: "", logoUrl: "" }) };
  }
  @Patch("website")
  async updateWebsite(@Req() req: Request, @Body() b: any) {
    const p = await principal(req); admin(p);
    const current: any = await getSetting("admin:website-content", { heroTitle: "Your videos, your world.", heroSubtitle: "Watch and share videos on YourTab.", aboutText: "", footerText: "", logoUrl: "" });
    for (const [key, max] of Object.entries({ heroTitle: 180, heroSubtitle: 500, aboutText: 10000, footerText: 2000, logoUrl: 1000 }) as Array<[string, number]>) {
      if (b[key] !== undefined) { const value = text(b[key], max, key); if (key === "logoUrl" && value && !/^https:\/\//i.test(value)) throw new BadRequestException("Logo URL must use HTTPS"); current[key] = value; }
    }
    await putSetting("admin:website-content", current); await audit(p.id, "website.update", "PlatformMetadata", "admin:website-content", { fields: Object.keys(b) });
    return { data: current };
  }

  @Get("navigation")
  async navigation(@Req() req: Request) {
    const p = await principal(req); staff(p);
    return { data: await getSetting("admin:site-navigation", [{ label: "Home", href: "/" }, { label: "Browse", href: "/#videos" }, { label: "Profile", href: "/profile" }]) };
  }
  @Patch("navigation")
  async updateNavigation(@Req() req: Request, @Body() b: any) {
    const p = await principal(req); admin(p);
    if (!Array.isArray(b.items) || b.items.length > 30) throw new BadRequestException("items must be an array of at most 30 links");
    const items = b.items.map((x: any) => {
      const label = text(x.label, 60, "Navigation label", true), href = text(x.href, 300, "Navigation URL", true);
      if (!(href.startsWith("/") && !href.startsWith("//")) && !/^https:\/\//i.test(href)) throw new BadRequestException("Navigation links must be site-relative or HTTPS URLs");
      return { label, href };
    });
    await putSetting("admin:site-navigation", items); await audit(p.id, "navigation.update", "PlatformMetadata", "admin:site-navigation", { count: items.length });
    return { data: items };
  }

  @Get("theme")
  async theme(@Req() req: Request) {
    const p = await principal(req); staff(p);
    return { data: await getSetting("admin:theme-branding", { theme: "dark", accent: "#22d3ee", logoUrl: "" }) };
  }
  @Patch("theme")
  async updateTheme(@Req() req: Request, @Body() b: any) {
    const p = await principal(req); admin(p);
    const current: any = await getSetting("admin:theme-branding", { theme: "dark", accent: "#22d3ee", logoUrl: "" });
    if (b.theme !== undefined) { if (!["dark", "light", "system"].includes(b.theme)) throw new BadRequestException("Invalid theme"); current.theme = b.theme; }
    if (b.accent !== undefined) { const accent = text(b.accent, 7, "Accent color", true); if (!/^#[0-9a-f]{6}$/i.test(accent)) throw new BadRequestException("Accent must be a hex color"); current.accent = accent; }
    if (b.logoUrl !== undefined) { const logoUrl = text(b.logoUrl, 1000, "Logo URL"); if (logoUrl && !/^https:\/\//i.test(logoUrl)) throw new BadRequestException("Logo URL must use HTTPS"); current.logoUrl = logoUrl; }
    await putSetting("admin:theme-branding", current); await audit(p.id, "theme.update", "PlatformMetadata", "admin:theme-branding", { fields: Object.keys(b) });
    return { data: current };
  }

  @Get("storage")
  async storage(@Req() req: Request) {
    const p = await principal(req); admin(p);
    return { data: { provider: process.env.S3_ENDPOINT ? "S3-compatible storage" : "AWS S3/default", bucketConfigured: !!process.env.S3_BUCKET, region: process.env.S3_REGION || null, endpoint: process.env.S3_ENDPOINT || null, cdnBaseUrl: process.env.S3_PUBLIC_BASE_URL || null, credentialsConfigured: !!((process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID) && (process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY)), note: "Credentials are never returned by this endpoint. Change credentials in the server environment, not from the browser." } };
  }

  @Post("notifications/broadcast")
  async broadcast(@Req() req: Request, @Body() b: any) {
    const p = await principal(req); admin(p);
    const title = text(b.title, 160, "Title", true), body = text(b.body, 2000, "Message", true);
    let userIds: string[];
    if (Array.isArray(b.userIds) && b.userIds.length) {
      if (b.userIds.length > 500) throw new BadRequestException("A broadcast can target at most 500 users");
      const requestedIds = (b.userIds as unknown[]).map((id: unknown) => text(id, 100, "User ID", true));
      userIds = Array.from(new Set<string>(requestedIds));
    } else {
      const users = await prisma.user.findMany({ where: { status: "ACTIVE" }, select: { id: true }, take: 10000 });
      userIds = users.map((u: any) => u.id);
    }
    if (!userIds.length) return { data: { created: 0 } };
    const result = await prisma.notification.createMany({ data: userIds.map(userId => ({ userId, title, body })) });
    await audit(p.id, "notification.broadcast", "Notification", undefined, { count: result.count, title });
    return { data: { created: result.count } };
  }
}
