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
