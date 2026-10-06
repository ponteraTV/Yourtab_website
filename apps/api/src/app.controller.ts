import {
  Body, Controller, Delete, Get, Headers, Param, Patch, Post, Query, Req, Res, UnauthorizedException, ForbiddenException
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { hash, compare } from "bcryptjs";
import { prisma } from "@vaultstream/database";
import { signAccessToken, verifyAccessToken, type AuthenticatedPrincipal } from "@vaultstream/auth";
import { objectExists, presignPut, publicUrl } from "@vaultstream/storage";
import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379");
const cookieName = "vaultstream_session";

async function principal(req: Request): Promise<AuthenticatedPrincipal> {
  const token = req.cookies?.[cookieName] as string | undefined;
  if (!token) throw new UnauthorizedException();
  try { return await verifyAccessToken(token); } catch { throw new UnauthorizedException(); }
}
function adminOnly(p: AuthenticatedPrincipal) {
  if (p.role !== "ADMIN" && p.role !== "MODERATOR") throw new ForbiddenException();
}
function slugify(s: string) { return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || randomUUID(); }

@Controller("v1")
export class AppController {
  @Get("health") health() { return { data: { status: "ok", service: "vaultstream-api" } }; }

  @Post("auth/register")
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  async register(@Body() body: { email: string; password: string; name: string }, @Res({ passthrough:true }) res: Response) {
    if (!body.email || !body.password || body.password.length < 8 || !body.name) throw new UnauthorizedException("Invalid registration data");
    const email = body.email.trim().toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) throw new UnauthorizedException("Email already registered");
    const user = await prisma.user.create({ data: { email, name: body.name.trim(), passwordHash: await hash(body.password, 12) } });
    await prisma.auditLog.create({ data: { actorId: user.id, action: "REGISTER", entity: "User", entityId: user.id } });
    await this.setSession(res, { id:user.id, email:user.email, role:user.role });
    return { data: { id:user.id, email:user.email, name:user.name, role:user.role } };
  }

  @Post("auth/login")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body() body: { email: string; password: string }, @Res({ passthrough:true }) res: Response) {
    const user = await prisma.user.findUnique({ where:{ email: body.email.trim().toLowerCase() } });
    if (!user || user.status !== "ACTIVE" || !(await compare(body.password, user.passwordHash))) throw new UnauthorizedException("Invalid credentials");
    await prisma.user.update({ where:{id:user.id}, data:{lastLoginAt:new Date()} });
    await this.setSession(res, {id:user.id,email:user.email,role:user.role});
    return { data:{id:user.id,email:user.email,name:user.name,role:user.role} };
  }

  @Post("auth/logout")
  async logout(@Res({ passthrough:true }) res: Response) { res.clearCookie(cookieName, { httpOnly:true, sameSite:"lax", secure:process.env.NODE_ENV==="production" }); return {data:{ok:true}}; }

  @Get("auth/me")
  async me(@Req() req: Request) {
    const p = await principal(req);
    const user = await prisma.user.findUnique({where:{id:p.id}, select:{id:true,email:true,name:true,role:true,status:true}});
    return {data:user};
  }

  private async setSession(res: Response, p: AuthenticatedPrincipal) {
    const token = await signAccessToken(p);
    res.cookie(cookieName, token, { httpOnly:true, sameSite:"lax", secure:process.env.NODE_ENV==="production", maxAge:15*60*1000, path:"/" });
  }

  @Post("uploads/presign")
  async presign(@Req() req: Request, @Body() body:{filename:string; contentType:string}) {
    const p=await principal(req);
    if (!body.contentType.startsWith("video/")) throw new ForbiddenException("Only video uploads are supported");
    const safe=body.filename.replace(/[^a-zA-Z0-9._-]/g,"_");
    const key=`uploads/${p.id}/${Date.now()}-${randomUUID()}-${safe}`;
    return {data:{key,url:await presignPut(key,body.contentType),expiresIn:900}};
  }

  @Post("videos")
  async createVideo(@Req() req:Request,@Body() body:{title:string;description?:string;sourceKey:string;categoryIds?:string[];tagIds?:string[];visibility?:string}) {
    const p=await principal(req);
    if (!(await objectExists(body.sourceKey))) throw new ForbiddenException("Source object not found");
    const slug=slugify(body.title)+"-"+randomUUID().slice(0,8);
    const video=await prisma.video.create({data:{
      ownerId:p.id,title:body.title.trim(),slug,description:body.description?.trim(),sourceKey:body.sourceKey,status:"QUEUED" as never,
      visibility:(body.visibility as never) || "PUBLIC",
      categories:{create:(body.categoryIds??[]).map(categoryId=>({category:{connect:{id:categoryId}}}))},
      tags:{create:(body.tagIds??[]).map(tagId=>({tag:{connect:{id:tagId}}}))},
      processingJobs:{create:{status:"QUEUED"}}
    }});
    await redis.lpush("vaultstream:video-jobs", video.id);
    return {data:video};
  }

  @Get("videos")
  async videos(@Query() q:{search?:string;category?:string;tag?:string;page?:string;limit?:string}) {
    const page=Math.max(1,Number(q.page)||1), limit=Math.min(50,Math.max(1,Number(q.limit)||20));
    const where:any={status:"READY",visibility:"PUBLIC"};
    if(q.search) where.OR=[{title:{contains:q.search,mode:"insensitive"}},{description:{contains:q.search,mode:"insensitive"}}];
    if(q.category) where.categories={some:{category:{slug:q.category}}};
    if(q.tag) where.tags={some:{tag:{slug:q.tag}}};
    const [items,total]=await Promise.all([prisma.video.findMany({where,orderBy:{publishedAt:"desc"},skip:(page-1)*limit,take:limit,include:{categories:{include:{category:true}},tags:{include:{tag:true}}}}),prisma.video.count({where})]);
    return {data:{items,total,page,limit}};
  }

  @Get("videos/:id")
  async video(@Param("id") id:string) {
    const video=await prisma.video.findFirst({where:{id,status:"READY",visibility:{in:["PUBLIC","UNLISTED"]}},include:{categories:{include:{category:true}},tags:{include:{tag:true}}}});
    if(!video) throw new UnauthorizedException("Video not found");
    return {data:{...video,views:Number(video.views),streamUrl:video.hlsKey?publicUrl(video.hlsKey):null}};
  }

  @Post("videos/:id/view")
  @Throttle({ default:{limit:60,ttl:60000} })
  async view(@Param("id") id:string,@Req() req:Request,@Body() body:{positionSec?:number}) {
    const video=await prisma.video.findFirst({where:{id,status:"READY"}});
    if(!video) throw new UnauthorizedException("Video not found");
    await prisma.video.update({where:{id},data:{views:{increment:1}}});
    const token=req.cookies?.[cookieName] ? await verifyAccessToken(req.cookies[cookieName] as string).catch(()=>null) : null;
    if(token) await prisma.watchHistory.upsert({where:{userId_videoId:{userId:token.id,videoId:id}},create:{userId:token.id,videoId:id,positionSec:Math.max(0,body.positionSec??0)},update:{positionSec:Math.max(0,body.positionSec??0),watchedAt:new Date()}});
    return {data:{ok:true}};
  }

  @Post("videos/:id/like")
  async like(@Req() req:Request,@Param("id") id:string) {
    const p=await principal(req); const video=await prisma.video.findUnique({where:{id}});
    if(!video) throw new UnauthorizedException("Video not found");
    const existing=await prisma.videoLike.findUnique({where:{userId_videoId:{userId:p.id,videoId:id}}});
    if(existing){await prisma.videoLike.delete({where:{userId_videoId:{userId:p.id,videoId:id}}}); await prisma.video.update({where:{id},data:{likesCount:{decrement:1}}}); return {data:{liked:false}};}
    await prisma.videoLike.create({data:{userId:p.id,videoId:id}}); await prisma.video.update({where:{id},data:{likesCount:{increment:1}}}); return {data:{liked:true}};
  }

  @Get("history")
  async history(@Req() req:Request){const p=await principal(req);return {data:await prisma.watchHistory.findMany({where:{userId:p.id},orderBy:{watchedAt:"desc"},include:{video:true},take:100})};}

  @Get("categories")
  async categories(){return {data:await prisma.category.findMany({orderBy:{name:"asc"}})};}
  @Post("categories")
  async createCategory(@Req() req:Request,@Body() body:{name:string;description?:string}){const p=await principal(req);adminOnly(p);return {data:await prisma.category.create({data:{name:body.name,slug:slugify(body.name),description:body.description}})};}
  @Get("tags")
  async tags(){return {data:await prisma.tag.findMany({orderBy:{name:"asc"}})};}

  @Get("playlists")
  async playlists(@Req() req:Request){const p=await principal(req);return {data:await prisma.playlist.findMany({where:{userId:p.id},include:{items:{orderBy:{position:"asc"},include:{video:true}}})}};}
  @Post("playlists")
  async createPlaylist(@Req() req:Request,@Body() body:{name:string;description?:string;isPublic?:boolean}){const p=await principal(req);return {data:await prisma.playlist.create({data:{userId:p.id,name:body.name,description:body.description,isPublic:body.isPublic??false}})};}
  @Post("playlists/:id/items")
  async addPlaylist(@Req() req:Request,@Param("id") id:string,@Body() body:{videoId:string}){const p=await principal(req);const list=await prisma.playlist.findFirst({where:{id,userId:p.id}});if(!list)throw new ForbiddenException();const last=await prisma.playlistItem.findFirst({where:{playlistId:id},orderBy:{position:"desc"}});return {data:await prisma.playlistItem.create({data:{playlistId:id,videoId:body.videoId,position:(last?.position??-1)+1}})};}

  @Get("notifications")
  async notifications(@Req() req:Request){const p=await principal(req);return {data:await prisma.notification.findMany({where:{userId:p.id},orderBy:{createdAt:"desc"},take:50})};}
  @Patch("notifications/:id/read")
  async notificationRead(@Req() req:Request,@Param("id") id:string){const p=await principal(req);return {data:await prisma.notification.updateMany({where:{id,userId:p.id},data:{readAt:new Date()}})};}

  @Get("ads")
  async ads(){return {data:await prisma.advertisement.findMany({where:{status:"ACTIVE"},orderBy:{createdAt:"desc"}})};}
  @Get("admin/stats")
  async stats(@Req() req:Request){const p=await principal(req);adminOnly(p);const [users,videos,views,likes,jobs]=await Promise.all([prisma.user.count(),prisma.video.count(),prisma.video.aggregate({_sum:{views:true}}),prisma.video.aggregate({_sum:{likesCount:true}}),prisma.videoJob.groupBy({by:["status"],_count:true})]);return {data:{users,videos,views:Number(views._sum.views??0),likes:likes._sum.likesCount??0,jobs}};}
  @Get("admin/users")
  async users(@Req() req:Request){const p=await principal(req);adminOnly(p);return {data:await prisma.user.findMany({select:{id:true,email:true,name:true,role:true,status:true,createdAt:true,lastLoginAt:true},orderBy:{createdAt:"desc"},take:500})};}
  @Patch("admin/users/:id")
  async updateUser(@Req() req:Request,@Param("id") id:string,@Body() body:{role?:string;status?:string}){const p=await principal(req);adminOnly(p);if(id===p.id&&body.status==="SUSPENDED")throw new ForbiddenException("Cannot suspend yourself");return {data:await prisma.user.update({where:{id},data:{role:body.role as never,status:body.status as never}})};}
  @Get("admin/videos")
  async adminVideos(@Req() req:Request){const p=await principal(req);adminOnly(p);return {data:await prisma.video.findMany({orderBy:{createdAt:"desc"},include:{owner:{select:{email:true,name:true}},processingJobs:true},take:500})};}
  @Patch("admin/videos/:id")
  async moderateVideo(@Req() req:Request,@Param("id") id:string,@Body() body:{status?:string;visibility?:string}){const p=await principal(req);adminOnly(p);return {data:await prisma.video.update({where:{id},data:{status:body.status as never,visibility:body.visibility as never}})};}
  @Get("admin/audit")
  async audit(@Req() req:Request){const p=await principal(req);adminOnly(p);return {data:await prisma.auditLog.findMany({orderBy:{createdAt:"desc"},take:300,include:{actor:{select:{email:true,name:true}}})};}

  @Post("admin/ads")
  async createAd(@Req() req:Request,@Body() body:{name:string;type:string;mediaUrl:string;targetUrl?:string}){const p=await principal(req);adminOnly(p);return {data:await prisma.advertisement.create({data:{name:body.name,type:body.type as never,mediaUrl:body.mediaUrl,targetUrl:body.targetUrl}})};}
  @Patch("admin/ads/:id")
  async updateAd(@Req() req:Request,@Param("id") id:string,@Body() body:{status?:string}){const p=await principal(req);adminOnly(p);return {data:await prisma.advertisement.update({where:{id},data:{status:body.status as never}})};}
}
