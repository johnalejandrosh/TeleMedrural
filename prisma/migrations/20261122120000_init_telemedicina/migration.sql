-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "telemedicina";

-- CreateEnum
CREATE TYPE "document_type" AS ENUM ('cc', 'ti', 'rc', 'ce', 'ppt', 'pa', 'sd');

-- CreateEnum
CREATE TYPE "sex" AS ENUM ('f', 'm', 'i');

-- CreateEnum
CREATE TYPE "risk_level" AS ENUM ('low', 'low_medium', 'medium', 'high');

-- CreateEnum
CREATE TYPE "consciousness" AS ENUM ('a', 'c', 'v', 'p', 'u');

-- CreateEnum
CREATE TYPE "case_status" AS ENUM ('pending', 'reviewed');

-- CreateEnum
CREATE TYPE "care_plan" AS ENUM ('home_care', 'appointment', 'referral', 'emergency');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "phone" VARCHAR(30),
    "municipality" VARCHAR(80),
    "professional_id" VARCHAR(40),
    "password_hash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "data_consent_at" TIMESTAMP(3),
    "role_id" TEXT NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "description" VARCHAR(255),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255),
    "module" VARCHAR(60) NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" VARCHAR(64) NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "user_agent" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_tokens" (
    "id" VARCHAR(64) NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_name" VARCHAR(120) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "document_type" "document_type" NOT NULL,
    "document_number" VARCHAR(30),
    "first_name" VARCHAR(80) NOT NULL,
    "last_name" VARCHAR(80) NOT NULL,
    "birth_date" DATE NOT NULL,
    "sex" "sex" NOT NULL,
    "phone" VARCHAR(30),
    "insurer" VARCHAR(80),
    "municipality" VARCHAR(80) NOT NULL,
    "vereda" VARCHAR(120),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_cases" (
    "id" TEXT NOT NULL,
    "client_id" VARCHAR(64) NOT NULL,
    "number" SERIAL NOT NULL,
    "patient_id" TEXT NOT NULL,
    "captured_by_id" TEXT NOT NULL,
    "sync_batch_id" TEXT,
    "captured_at" TIMESTAMP(3) NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "municipality" VARCHAR(80) NOT NULL,
    "vereda" VARCHAR(120),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "chief_complaint" VARCHAR(500) NOT NULL,
    "symptoms" TEXT[],
    "symptoms_notes" VARCHAR(2000),
    "onset_days" INTEGER,
    "conditions" TEXT[],
    "allergies" VARCHAR(500),
    "medications" VARCHAR(1000),
    "pregnant" BOOLEAN,
    "background_notes" VARCHAR(2000),
    "respiratory_rate" INTEGER,
    "spo2" INTEGER,
    "spo2_scale2" BOOLEAN NOT NULL DEFAULT false,
    "supplemental_o2" BOOLEAN NOT NULL DEFAULT false,
    "systolic_bp" INTEGER,
    "diastolic_bp" INTEGER,
    "heart_rate" INTEGER,
    "consciousness" "consciousness",
    "temperature" DOUBLE PRECISION,
    "glucose" INTEGER,
    "weight_kg" DOUBLE PRECISION,
    "news2_score" INTEGER,
    "news2_device_score" INTEGER,
    "risk_level" "risk_level",
    "news2_breakdown" JSONB,
    "news2_incomplete" BOOLEAN NOT NULL DEFAULT false,
    "status" "case_status" NOT NULL DEFAULT 'pending',
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinical_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_notes" (
    "id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" VARCHAR(5000) NOT NULL,
    "care_plan" "care_plan",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_batches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_id" VARCHAR(64),
    "app_version" VARCHAR(40),
    "received" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "duplicated" INTEGER NOT NULL DEFAULT 0,
    "rejected" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_batches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "permissions_module_idx" ON "permissions"("module");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE INDEX "api_tokens_user_id_idx" ON "api_tokens"("user_id");

-- CreateIndex
CREATE INDEX "patients_last_name_first_name_idx" ON "patients"("last_name", "first_name");

-- CreateIndex
CREATE INDEX "patients_municipality_idx" ON "patients"("municipality");

-- CreateIndex
CREATE UNIQUE INDEX "patients_document_type_document_number_key" ON "patients"("document_type", "document_number");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_cases_client_id_key" ON "clinical_cases"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "clinical_cases_number_key" ON "clinical_cases"("number");

-- CreateIndex
CREATE INDEX "clinical_cases_status_risk_level_idx" ON "clinical_cases"("status", "risk_level");

-- CreateIndex
CREATE INDEX "clinical_cases_patient_id_captured_at_idx" ON "clinical_cases"("patient_id", "captured_at");

-- CreateIndex
CREATE INDEX "clinical_cases_captured_by_id_captured_at_idx" ON "clinical_cases"("captured_by_id", "captured_at");

-- CreateIndex
CREATE INDEX "clinical_cases_synced_at_idx" ON "clinical_cases"("synced_at");

-- CreateIndex
CREATE INDEX "clinical_cases_municipality_idx" ON "clinical_cases"("municipality");

-- CreateIndex
CREATE INDEX "medical_notes_case_id_created_at_idx" ON "medical_notes"("case_id", "created_at");

-- CreateIndex
CREATE INDEX "medical_notes_author_id_idx" ON "medical_notes"("author_id");

-- CreateIndex
CREATE INDEX "sync_batches_received_at_idx" ON "sync_batches"("received_at");

-- CreateIndex
CREATE INDEX "sync_batches_user_id_received_at_idx" ON "sync_batches"("user_id", "received_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_cases" ADD CONSTRAINT "clinical_cases_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_cases" ADD CONSTRAINT "clinical_cases_captured_by_id_fkey" FOREIGN KEY ("captured_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_cases" ADD CONSTRAINT "clinical_cases_sync_batch_id_fkey" FOREIGN KEY ("sync_batch_id") REFERENCES "sync_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_cases" ADD CONSTRAINT "clinical_cases_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_notes" ADD CONSTRAINT "medical_notes_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "clinical_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_notes" ADD CONSTRAINT "medical_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_batches" ADD CONSTRAINT "sync_batches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_batches" ADD CONSTRAINT "sync_batches_token_id_fkey" FOREIGN KEY ("token_id") REFERENCES "api_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

