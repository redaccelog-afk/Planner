-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PLANIFICATEUR', 'FORMATEUR', 'LECTEUR');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('CACES', 'VR', 'SECURITE', 'SECOURISME', 'AUTRE');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('NOUVELLE', 'EN_RECHERCHE', 'PROPOSEE', 'CONFIRMEE', 'ANNULEE', 'CLOTUREE');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('PROVISOIRE', 'CONFIRMEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('DISPONIBLE', 'OCCUPE', 'TENTATIF');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('A_RESERVER', 'RESERVE', 'CONFIRME', 'ANNULE');

-- CreateEnum
CREATE TYPE "MaterialStatus" AS ENUM ('DISPONIBLE', 'ASSIGNE', 'MAINTENANCE', 'RETIRE');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CONVOCATION', 'LISTE_PRESENCE', 'EVALUATION', 'TEST', 'RAPPORT', 'CERTIFICAT', 'BON_SORTIE_MATERIEL', 'VOUCHER_HOTEL');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('A_PREPARER', 'PRET', 'REMIS_FORMATEUR', 'RECUPERE', 'VALIDE', 'ENVOYE_CLIENT');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('ATTENDU', 'RECU', 'CORRIGE', 'ENVOYE_CLIENT');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('ENTRANT', 'SORTANT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CONFIRMATION_CLIENT_DEMANDEE', 'RAPPEL_FORMATEUR', 'DOCUMENTS_PRETS', 'RAPPEL_HOTEL_ITINERAIRE', 'DEMANDE_RAPPORT', 'RELANCE_RAPPORT', 'ENVOI_RAPPORT_CLIENT', 'ALERTE_STOCK', 'AUTRE');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('EN_ATTENTE', 'ENVOYEE', 'ECHOUEE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'SEND_EMAIL', 'SEND_WHATSAPP', 'CONFIRM', 'CANCEL', 'UPLOAD');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'LECTEUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "trainers" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "magicLinkToken" TEXT,
    "magicLinkExpiry" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "themes" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "durationDays" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_themes" (
    "trainerId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "ratePerDay" DOUBLE PRECISION,
    "certified" BOOLEAN NOT NULL DEFAULT true,
    "certifiedUntil" TIMESTAMP(3),

    CONSTRAINT "trainer_themes_pkey" PRIMARY KEY ("trainerId","themeId")
);

-- CreateTable
CREATE TABLE "trainer_rates" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "ratePerDay" DOUBLE PRECISION NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),

    CONSTRAINT "trainer_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_contacts" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "primary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "client_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_sites" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "client_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "priceMin" DOUBLE PRECISION,
    "priceMax" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "serial" TEXT,
    "status" "MaterialStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_needs" (
    "themeId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "required" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "material_needs_pkey" PRIMARY KEY ("themeId","materialId")
);

-- CreateTable
CREATE TABLE "consumables" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'pièce',
    "stockQty" INTEGER NOT NULL DEFAULT 0,
    "reorderAt" INTEGER NOT NULL DEFAULT 10,
    "unitCost" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consumables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumable_needs" (
    "themeId" TEXT NOT NULL,
    "consumableId" TEXT NOT NULL,
    "qtyPerParticipant" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "consumable_needs_pkey" PRIMARY KEY ("themeId","consumableId")
);

-- CreateTable
CREATE TABLE "training_requests" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "participants" INTEGER NOT NULL,
    "desiredDateFrom" TIMESTAMP(3),
    "desiredDateTo" TIMESTAMP(3),
    "status" "RequestStatus" NOT NULL DEFAULT 'NOUVELLE',
    "urgency" INTEGER NOT NULL DEFAULT 0,
    "emailSourceId" TEXT,
    "emailThreadId" TEXT,
    "rawEmailBody" TEXT,
    "aiExtracted" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_themes" (
    "requestId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,

    CONSTRAINT "request_themes_pkey" PRIMARY KEY ("requestId","themeId")
);

-- CreateTable
CREATE TABLE "training_sessions" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "themeId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "status" "SessionStatus" NOT NULL DEFAULT 'PROVISOIRE',
    "outlookEventId" TEXT,
    "totalCost" DOUBLE PRECISION,
    "costBreakdown" JSONB,
    "trainerConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "clientConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availabilities" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AvailabilityStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "notes" TEXT,

    CONSTRAINT "availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_bookings" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "hotelId" TEXT,
    "hotelName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'A_RESERVER',
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "material_assignments" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "material_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumable_usages" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "consumableId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "decremented" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "consumable_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "consumableId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'A_PREPARER',
    "fileUrl" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_versions" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_reports" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "rawFromTrainer" TEXT,
    "rawFileUrl" TEXT,
    "finalFileUrl" TEXT,
    "finalPdfUrl" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'ATTENDU',
    "trainerUploadToken" TEXT,
    "trainerUploadExpiry" TIMESTAMP(3),
    "sentToClientAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_threads" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "sessionId" TEXT,
    "waThreadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "direction" "Direction" NOT NULL,
    "body" TEXT NOT NULL,
    "waMessageId" TEXT,
    "intent" TEXT,
    "parsedDate" TIMESTAMP(3),
    "parsedDates" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_threads" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "subject" TEXT,
    "outlookConversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "direction" "Direction" NOT NULL,
    "outlookId" TEXT,
    "subject" TEXT,
    "body" TEXT,
    "fromAddress" TEXT,
    "toAddresses" JSONB,
    "sentAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "read" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "email_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "type" "NotificationType" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "payload" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distance_cache" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "distanceKm" DOUBLE PRECISION NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "distance_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_config" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_sessionToken_key" ON "auth_sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "trainers_magicLinkToken_key" ON "trainers"("magicLinkToken");

-- CreateIndex
CREATE UNIQUE INDEX "themes_code_key" ON "themes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "availabilities_trainerId_date_key" ON "availabilities"("trainerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_bookings_sessionId_key" ON "hotel_bookings"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "consumable_usages_sessionId_consumableId_key" ON "consumable_usages"("sessionId", "consumableId");

-- CreateIndex
CREATE UNIQUE INDEX "training_reports_sessionId_key" ON "training_reports"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "training_reports_trainerUploadToken_key" ON "training_reports"("trainerUploadToken");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_messages_waMessageId_key" ON "whatsapp_messages"("waMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "email_messages_outlookId_key" ON "email_messages"("outlookId");

-- CreateIndex
CREATE UNIQUE INDEX "distance_cache_trainerId_siteId_key" ON "distance_cache"("trainerId", "siteId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_themes" ADD CONSTRAINT "trainer_themes_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_themes" ADD CONSTRAINT "trainer_themes_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "themes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_rates" ADD CONSTRAINT "trainer_rates_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_contacts" ADD CONSTRAINT "client_contacts_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_sites" ADD CONSTRAINT "client_sites_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_needs" ADD CONSTRAINT "material_needs_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "themes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_needs" ADD CONSTRAINT "material_needs_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumable_needs" ADD CONSTRAINT "consumable_needs_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "themes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumable_needs" ADD CONSTRAINT "consumable_needs_consumableId_fkey" FOREIGN KEY ("consumableId") REFERENCES "consumables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_requests" ADD CONSTRAINT "training_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_requests" ADD CONSTRAINT "training_requests_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "client_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_requests" ADD CONSTRAINT "training_requests_emailThreadId_fkey" FOREIGN KEY ("emailThreadId") REFERENCES "email_threads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_themes" ADD CONSTRAINT "request_themes_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "training_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_themes" ADD CONSTRAINT "request_themes_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "themes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "training_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "themes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availabilities" ADD CONSTRAINT "availabilities_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_bookings" ADD CONSTRAINT "hotel_bookings_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_assignments" ADD CONSTRAINT "material_assignments_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "material_assignments" ADD CONSTRAINT "material_assignments_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumable_usages" ADD CONSTRAINT "consumable_usages_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumable_usages" ADD CONSTRAINT "consumable_usages_consumableId_fkey" FOREIGN KEY ("consumableId") REFERENCES "consumables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_consumableId_fkey" FOREIGN KEY ("consumableId") REFERENCES "consumables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_reports" ADD CONSTRAINT "training_reports_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_threads" ADD CONSTRAINT "whatsapp_threads_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_threads" ADD CONSTRAINT "whatsapp_threads_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "training_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "whatsapp_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_threads" ADD CONSTRAINT "email_threads_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_messages" ADD CONSTRAINT "email_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "email_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "training_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distance_cache" ADD CONSTRAINT "distance_cache_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distance_cache" ADD CONSTRAINT "distance_cache_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "client_sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- CreateEnum
CREATE TYPE "TrainerType" AS ENUM ('INTERNE', 'EXTERNE');

-- CreateEnum
CREATE TYPE "PreselectionStatus" AS ENUM ('CANDIDAT', 'EN_EVALUATION', 'ACCEPTE', 'REFUSE');

-- CreateEnum
CREATE TYPE "NegotiationStatus" AS ENUM ('EN_COURS', 'ACCEPTEE', 'REFUSEE', 'EXPIREE');

-- CreateEnum
CREATE TYPE "FrameworkStatus" AS ENUM ('ACTIF', 'EXPIRE', 'RESILIE');

-- CreateEnum
CREATE TYPE "PrestationStatus" AS ENUM ('BROUILLON', 'BON_COMMANDE_EMIS', 'BON_COMMANDE_ACCEPTE', 'FACTURE_RECUE', 'VALIDE', 'PAYE', 'LITIGE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('BROUILLON', 'EMISE', 'ENVOYEE_CLIENT', 'PAYEE', 'EN_RETARD', 'ANNULEE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'INVOICE_EMIT';
ALTER TYPE "AuditAction" ADD VALUE 'INVOICE_PAY';
ALTER TYPE "AuditAction" ADD VALUE 'PO_EMIT';
ALTER TYPE "AuditAction" ADD VALUE 'PO_VALIDATE';
ALTER TYPE "AuditAction" ADD VALUE 'NEGOTIATE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'FACTURE_EMISE';
ALTER TYPE "NotificationType" ADD VALUE 'RELANCE_PAIEMENT_J30';
ALTER TYPE "NotificationType" ADD VALUE 'RELANCE_PAIEMENT_J45';
ALTER TYPE "NotificationType" ADD VALUE 'RELANCE_PAIEMENT_J60';
ALTER TYPE "NotificationType" ADD VALUE 'BON_COMMANDE_EXTERNE';
ALTER TYPE "NotificationType" ADD VALUE 'NEGOCIATION_EXPIREE';
ALTER TYPE "NotificationType" ADD VALUE 'CONVENTION_EXPIREE';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'COMPTABILITE';

-- AlterTable
ALTER TABLE "trainers" ADD COLUMN     "bankName" TEXT,
ADD COLUMN     "cnss" TEXT,
ADD COLUMN     "defaultDayRate" DOUBLE PRECISION,
ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "employerCost" DOUBLE PRECISION,
ADD COLUMN     "iban" TEXT,
ADD COLUMN     "ice" TEXT,
ADD COLUMN     "ifFiscal" TEXT,
ADD COLUMN     "legalStatus" TEXT,
ADD COLUMN     "paymentTerms" INTEGER DEFAULT 30,
ADD COLUMN     "rc" TEXT,
ADD COLUMN     "type" "TrainerType" NOT NULL DEFAULT 'EXTERNE';

-- CreateTable
CREATE TABLE "preselections" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "status" "PreselectionStatus" NOT NULL DEFAULT 'CANDIDAT',
    "source" TEXT,
    "cvUrl" TEXT,
    "evaluationScore" INTEGER,
    "evaluationNotes" TEXT,
    "evaluatedBy" TEXT,
    "evaluatedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preselections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frameworks" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status" "FrameworkStatus" NOT NULL DEFAULT 'ACTIF',
    "fileUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "frameworks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "negotiation_steps" (
    "id" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "frameworkId" TEXT,
    "themeId" TEXT,
    "proposedRate" DOUBLE PRECISION NOT NULL,
    "counterRate" DOUBLE PRECISION,
    "agreedRate" DOUBLE PRECISION,
    "status" "NegotiationStatus" NOT NULL DEFAULT 'EN_COURS',
    "validUntil" TIMESTAMP(3),
    "initiatedBy" TEXT,
    "notes" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "negotiation_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prestations" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "frameworkId" TEXT,
    "agreedRate" DOUBLE PRECISION NOT NULL,
    "daysCount" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "PrestationStatus" NOT NULL DEFAULT 'BROUILLON',
    "poReference" TEXT,
    "poEmittedAt" TIMESTAMP(3),
    "poFileUrl" TEXT,
    "trainerAcceptedAt" TIMESTAMP(3),
    "invoiceReference" TEXT,
    "invoiceReceivedAt" TIMESTAMP(3),
    "invoiceFileUrl" TEXT,
    "invoiceAmount" DOUBLE PRECISION,
    "coherenceCheck" BOOLEAN,
    "coherenceNotes" TEXT,
    "paidAt" TIMESTAMP(3),
    "paymentRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prestations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'BROUILLON',
    "subtotal" DOUBLE PRECISION NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "taxAmount" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "fileUrl" TEXT,
    "notes" TEXT,
    "paidAt" TIMESTAMP(3),
    "paymentRef" TEXT,
    "paidAmount" DOUBLE PRECISION,
    "reminderSentJ30" BOOLEAN NOT NULL DEFAULT false,
    "reminderSentJ45" BOOLEAN NOT NULL DEFAULT false,
    "reminderSentJ60" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "sessionId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "prestations_sessionId_key" ON "prestations"("sessionId");

-- AddForeignKey
ALTER TABLE "preselections" ADD CONSTRAINT "preselections_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frameworks" ADD CONSTRAINT "frameworks_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiation_steps" ADD CONSTRAINT "negotiation_steps_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiation_steps" ADD CONSTRAINT "negotiation_steps_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "frameworks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "negotiation_steps" ADD CONSTRAINT "negotiation_steps_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestations" ADD CONSTRAINT "prestations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestations" ADD CONSTRAINT "prestations_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prestations" ADD CONSTRAINT "prestations_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "frameworks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "training_sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- CreateEnum
CREATE TYPE "IntakeChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'SMS', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "PipelineStatus" AS ENUM ('RECEIVED', 'PARSING', 'PARSED', 'TRAINER_SELECTION', 'CONTACTING_TRAINER', 'WAITING_PLANNER', 'WAITING_CLIENT', 'CLIENT_CONFIRMED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "demande_pipelines" (
    "id" TEXT NOT NULL,
    "channel" "IntakeChannel" NOT NULL,
    "rawMessage" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "fromName" TEXT,
    "externalMsgId" TEXT,
    "parsedThemeCode" TEXT,
    "parsedThemeLabel" TEXT,
    "parsedDateFrom" TIMESTAMP(3),
    "parsedDateTo" TIMESTAMP(3),
    "parsedParticipants" INTEGER,
    "parsedClientName" TEXT,
    "parsedSiteCity" TEXT,
    "parsedUrgency" INTEGER DEFAULT 0,
    "aiConfidence" DOUBLE PRECISION,
    "aiRawOutput" JSONB,
    "status" "PipelineStatus" NOT NULL DEFAULT 'RECEIVED',
    "currentTrainerIndex" INTEGER NOT NULL DEFAULT 0,
    "requestId" TEXT,
    "sessionId" TEXT,
    "parsedAt" TIMESTAMP(3),
    "trainerContactedAt" TIMESTAMP(3),
    "clientNotifiedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "notes" TEXT,
    "errorReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demande_pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trainer_candidates" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "trainerId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "proposedDates" JSONB,
    "waMessageId" TEXT,
    "contactedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "trainer_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_messages" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "direction" "Direction" NOT NULL,
    "channel" "IntakeChannel" NOT NULL,
    "fromAddr" TEXT NOT NULL,
    "toAddr" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "parsedData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pipeline_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trainer_candidates_pipelineId_trainerId_key" ON "trainer_candidates"("pipelineId", "trainerId");

-- AddForeignKey
ALTER TABLE "trainer_candidates" ADD CONSTRAINT "trainer_candidates_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "demande_pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trainer_candidates" ADD CONSTRAINT "trainer_candidates_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "trainers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_messages" ADD CONSTRAINT "pipeline_messages_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "demande_pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
