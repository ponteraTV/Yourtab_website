-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED', 'DELETED');
CREATE TYPE "VideoStatus" AS ENUM ('DRAFT', 'PROCESSING', 'READY', 'PUBLISHED', 'ARCHIVED', 'FAILED');
CREATE TYPE "VideoVisibility" AS ENUM ('PRIVATE', 'UNLISTED', 'PUBLIC');
CREATE TYPE "AssetType" AS ENUM ('SOURCE', 'THUMBNAIL', 'POSTER', 'HLS_MANIFEST', 'DASH_MANIFEST', 'CAPTION', 'TRANSCRIPT');
CREATE TYPE "AnalyticsEventType" AS ENUM ('VIDEO_VIEW', 'VIDEO_START', 'VIDEO_PROGRESS', 'VIDEO_COMPLETE', 'VIDEO_PAUSE', 'VIDEO_SEEK', 'VIDEO_ERROR', 'AD_IMPRESSION', 'AD_CLICK');
CREATE TYPE "AdStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');
CREATE TYPE "AdType" AS ENUM ('PRE_ROLL', 'MID_ROLL', 'POST_ROLL', 'BANNER', 'OVERLAY');

-- CreateTable
CREATE TABLE "User" (
  "id" TEXT NOT NULL, "email" TEXT NOT NULL, "passwordHash" TEXT NOT NULL,
  "firstName" TEXT, "lastName" TEXT, "avatarUrl" TEXT, "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "emailVerifiedAt" TIMESTAMP(3), "lastLoginAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMP(3), CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Role" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "description" TEXT, "isSystem" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Role_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Permission" ("id" TEXT NOT NULL, "key" TEXT NOT NULL, "resource" TEXT NOT NULL, "action" TEXT NOT NULL, "description" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Permission_pkey" PRIMARY KEY ("id"));
CREATE TABLE "UserRole" ("userId" TEXT NOT NULL, "roleId" TEXT NOT NULL, "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "assignedBy" TEXT, CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId", "roleId"));
CREATE TABLE "RolePermission" ("roleId" TEXT NOT NULL, "permissionId" TEXT NOT NULL, "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId"));
CREATE TABLE "Session" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Session_pkey" PRIMARY KEY ("id"));
CREATE TABLE "PasswordResetToken" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "usedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"));
CREATE TABLE "ApiKey" ("id" TEXT NOT NULL, "userId" TEXT NOT NULL, "name" TEXT NOT NULL, "keyPrefix" TEXT NOT NULL, "secretHash" TEXT NOT NULL, "lastUsedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3), "revokedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Video" ("id" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT, "slug" TEXT NOT NULL, "status" "VideoStatus" NOT NULL DEFAULT 'DRAFT', "visibility" "VideoVisibility" NOT NULL DEFAULT 'PRIVATE', "durationSeconds" INTEGER, "sourceUrl" TEXT, "playbackUrl" TEXT, "thumbnailUrl" TEXT, "publishedAt" TIMESTAMP(3), "processingError" TEXT, "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, "deletedAt" TIMESTAMP(3), CONSTRAINT "Video_pkey" PRIMARY KEY ("id"));
CREATE TABLE "VideoAsset" ("id" TEXT NOT NULL, "videoId" TEXT NOT NULL, "type" "AssetType" NOT NULL, "url" TEXT NOT NULL, "mimeType" TEXT, "sizeBytes" BIGINT, "width" INTEGER, "height" INTEGER, "bitrate" INTEGER, "language" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "VideoAsset_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Tag" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Tag_pkey" PRIMARY KEY ("id"));
CREATE TABLE "VideoTag" ("videoId" TEXT NOT NULL, "tagId" TEXT NOT NULL, CONSTRAINT "VideoTag_pkey" PRIMARY KEY ("videoId", "tagId"));
CREATE TABLE "AnalyticsEvent" ("id" TEXT NOT NULL, "videoId" TEXT, "userId" TEXT, "eventType" "AnalyticsEventType" NOT NULL, "sessionId" TEXT, "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "watchSeconds" INTEGER, "positionSeconds" INTEGER, "countryCode" TEXT, "deviceType" TEXT, "referrer" TEXT, "metadata" JSONB, CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id"));
CREATE TABLE "VideoAnalyticsDaily" ("id" TEXT NOT NULL, "videoId" TEXT NOT NULL, "date" DATE NOT NULL, "views" INTEGER NOT NULL DEFAULT 0, "uniqueViewers" INTEGER NOT NULL DEFAULT 0, "watchSeconds" BIGINT NOT NULL DEFAULT 0, "completions" INTEGER NOT NULL DEFAULT 0, "averageWatchPct" DOUBLE PRECISION NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "VideoAnalyticsDaily_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Advertiser" ("id" TEXT NOT NULL, "name" TEXT NOT NULL, "website" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Advertiser_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AdCampaign" ("id" TEXT NOT NULL, "advertiserId" TEXT NOT NULL, "ownerId" TEXT NOT NULL, "name" TEXT NOT NULL, "status" "AdStatus" NOT NULL DEFAULT 'DRAFT', "startsAt" TIMESTAMP(3), "endsAt" TIMESTAMP(3), "dailyBudget" DECIMAL(12,2), "totalBudget" DECIMAL(12,2), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "AdCampaign_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AdCampaignVideo" ("campaignId" TEXT NOT NULL, "videoId" TEXT NOT NULL, CONSTRAINT "AdCampaignVideo_pkey" PRIMARY KEY ("campaignId", "videoId"));
CREATE TABLE "Ad" ("id" TEXT NOT NULL, "campaignId" TEXT NOT NULL, "name" TEXT NOT NULL, "type" "AdType" NOT NULL, "mediaUrl" TEXT NOT NULL, "clickUrl" TEXT, "durationSec" INTEGER, "status" "AdStatus" NOT NULL DEFAULT 'DRAFT', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Ad_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AdImpression" ("id" TEXT NOT NULL, "adId" TEXT NOT NULL, "eventId" TEXT, "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AdImpression_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AdClick" ("id" TEXT NOT NULL, "adId" TEXT NOT NULL, "eventId" TEXT, "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AdClick_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AuditLog" ("id" TEXT NOT NULL, "actorId" TEXT, "action" TEXT NOT NULL, "entityType" TEXT NOT NULL, "entityId" TEXT, "before" JSONB, "after" JSONB, "ipAddress" TEXT, "userAgent" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"));

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_status_idx" ON "User"("status"); CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name"); CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key"); CREATE UNIQUE INDEX "Permission_resource_action_key" ON "Permission"("resource", "action");
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId"); CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash"); CREATE INDEX "Session_userId_idx" ON "Session"("userId"); CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash"); CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId"); CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
CREATE UNIQUE INDEX "ApiKey_secretHash_key" ON "ApiKey"("secretHash"); CREATE UNIQUE INDEX "ApiKey_userId_name_key" ON "ApiKey"("userId", "name"); CREATE INDEX "ApiKey_keyPrefix_idx" ON "ApiKey"("keyPrefix");
CREATE UNIQUE INDEX "Video_slug_key" ON "Video"("slug"); CREATE INDEX "Video_ownerId_status_idx" ON "Video"("ownerId", "status"); CREATE INDEX "Video_status_visibility_publishedAt_idx" ON "Video"("status", "visibility", "publishedAt"); CREATE INDEX "Video_deletedAt_idx" ON "Video"("deletedAt");
CREATE INDEX "VideoAsset_videoId_type_idx" ON "VideoAsset"("videoId", "type"); CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name"); CREATE INDEX "VideoTag_tagId_idx" ON "VideoTag"("tagId");
CREATE INDEX "AnalyticsEvent_videoId_occurredAt_idx" ON "AnalyticsEvent"("videoId", "occurredAt"); CREATE INDEX "AnalyticsEvent_userId_occurredAt_idx" ON "AnalyticsEvent"("userId", "occurredAt"); CREATE INDEX "AnalyticsEvent_eventType_occurredAt_idx" ON "AnalyticsEvent"("eventType", "occurredAt");
CREATE UNIQUE INDEX "VideoAnalyticsDaily_videoId_date_key" ON "VideoAnalyticsDaily"("videoId", "date"); CREATE INDEX "VideoAnalyticsDaily_date_idx" ON "VideoAnalyticsDaily"("date");
CREATE UNIQUE INDEX "Advertiser_name_key" ON "Advertiser"("name"); CREATE INDEX "AdCampaign_advertiserId_status_idx" ON "AdCampaign"("advertiserId", "status"); CREATE INDEX "AdCampaign_ownerId_idx" ON "AdCampaign"("ownerId"); CREATE INDEX "AdCampaign_status_startsAt_endsAt_idx" ON "AdCampaign"("status", "startsAt", "endsAt"); CREATE INDEX "AdCampaignVideo_videoId_idx" ON "AdCampaignVideo"("videoId"); CREATE INDEX "Ad_campaignId_status_idx" ON "Ad"("campaignId", "status");
CREATE UNIQUE INDEX "AdImpression_eventId_key" ON "AdImpression"("eventId"); CREATE INDEX "AdImpression_adId_occurredAt_idx" ON "AdImpression"("adId", "occurredAt"); CREATE UNIQUE INDEX "AdClick_eventId_key" ON "AdClick"("eventId"); CREATE INDEX "AdClick_adId_occurredAt_idx" ON "AdClick"("adId", "occurredAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt"); CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId"); CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Video" ADD CONSTRAINT "Video_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "VideoAsset" ADD CONSTRAINT "VideoAsset_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoTag" ADD CONSTRAINT "VideoTag_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VideoTag" ADD CONSTRAINT "VideoTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "VideoAnalyticsDaily" ADD CONSTRAINT "VideoAnalyticsDaily_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_advertiserId_fkey" FOREIGN KEY ("advertiserId") REFERENCES "Advertiser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdCampaign" ADD CONSTRAINT "AdCampaign_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdCampaignVideo" ADD CONSTRAINT "AdCampaignVideo_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdCampaignVideo" ADD CONSTRAINT "AdCampaignVideo_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ad" ADD CONSTRAINT "Ad_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AdCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdImpression" ADD CONSTRAINT "AdImpression_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdImpression" ADD CONSTRAINT "AdImpression_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "AnalyticsEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdClick" ADD CONSTRAINT "AdClick_adId_fkey" FOREIGN KEY ("adId") REFERENCES "Ad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdClick" ADD CONSTRAINT "AdClick_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "AnalyticsEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
