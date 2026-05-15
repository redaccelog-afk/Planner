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
