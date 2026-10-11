import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import { prisma } from "@vaultstream/database";
import { verifyAccessToken } from "@vaultstream/auth";

const cookieName = "vaultstream_session";
async function currentUser(req: Request) {
  const token = req.cookies?.[cookieName];
  if (!token) throw new BadRequestException("Sign in to comment");
  const payload = await verifyAccessToken(token);
  const user = await prisma.user.findUnique({ where: { id: payload.id }, select: { id: true, status: true } });
  if (!user || user.status !== "ACTIVE") throw new BadRequestException("Your account cannot comment");
  return user;
}
function validNow(startAt: Date | null, endAt: Date | null, now = new Date()) {
  return (!startAt || startAt <= now) && (!endAt || endAt >= now);
}

@Controller("v1")
export class PublicContentController {
  @Get("pages/:slug")
  async publishedPage(@Param("slug") slug: string) {
    const item = await prisma.contentPage.findFirst({ where: { slug, kind: "PAGE", status: "PUBLISHED", publishedAt: { lte: new Date() } }, select: { title: true, slug: true, excerpt: true, body: true, publishedAt: true, updatedAt: true } });
    if (!item) throw new NotFoundException("Page not found");
    return { data: item };
  }

  @Get("posts/:slug")
  async publishedPost(@Param("slug") slug: string) {
    const item = await prisma.contentPage.findFirst({ where: { slug, kind: "POST", status: "PUBLISHED", publishedAt: { lte: new Date() } }, select: { title: true, slug: true, excerpt: true, body: true, publishedAt: true, updatedAt: true } });
    if (!item) throw new NotFoundException("Post not found");
    return { data: item };
  }

  @Get("videos/:id/comments")
  async publicComments(@Param("id") id: string) {
    const video = await prisma.video.findFirst({ where: { id, status: "READY", visibility: { in: ["PUBLIC", "UNLISTED"] } }, select: { id: true } });
    if (!video) throw new NotFoundException("Video not found");
    const comments = await prisma.comment.findMany({ where: { videoId: id, status: "APPROVED" }, include: { user: { select: { id: true, name: true } } }, orderBy: { createdAt: "desc" }, take: 100 });
    return { data: comments };
  }

  @Post("videos/:id/comments")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createComment(@Req() req: Request, @Param("id") id: string, @Body() body: any) {
    const user = await currentUser(req);
    const setting = await prisma.platformMetadata.findUnique({ where: { key: "admin:system-settings" } });
    if (setting) {
      try { if (JSON.parse(setting.value).allowComments === false) throw new BadRequestException("Comments are currently disabled"); }
      catch (e) { if (e instanceof BadRequestException) throw e; }
    }
    const video = await prisma.video.findFirst({ where: { id, status: "READY", visibility: { in: ["PUBLIC", "UNLISTED"] } }, select: { id: true } });
    if (!video) throw new NotFoundException("Video not found");
    const text = String(body.body || "").trim();
    if (text.length < 1 || text.length > 2000) throw new BadRequestException("Comment must be between 1 and 2000 characters");
    const item = await prisma.comment.create({ data: { userId: user.id, videoId: id, body: text, status: "PENDING" }, select: { id: true, body: true, status: true, createdAt: true } });
    return { data: item };
  }

  @Post("ads/:id/impression")
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async adImpression(@Param("id") id: string) {
    const ad = await prisma.advertisement.findUnique({ where: { id }, select: { id: true, status: true, startAt: true, endAt: true } });
    if (!ad || ad.status !== "ACTIVE" || !validNow(ad.startAt, ad.endAt)) throw new NotFoundException("Advertisement not found");
    await prisma.advertisement.update({ where: { id }, data: { impressions: { increment: 1n } } });
    return { data: { ok: true } };
  }

  @Post("ads/:id/click")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async adClick(@Param("id") id: string) {
    const ad = await prisma.advertisement.findUnique({ where: { id }, select: { id: true, status: true, startAt: true, endAt: true, targetUrl: true } });
    if (!ad || ad.status !== "ACTIVE" || !validNow(ad.startAt, ad.endAt)) throw new NotFoundException("Advertisement not found");
    await prisma.advertisement.update({ where: { id }, data: { clicks: { increment: 1n } } });
    return { data: { targetUrl: ad.targetUrl } };
  }
}
