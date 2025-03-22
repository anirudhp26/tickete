-- CreateEnum
CREATE TYPE "DaysInWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "FetchTypes" AS ENUM ('TODAY', 'DAYS_7', 'DAYS_30');

-- CreateTable
CREATE TABLE "Product" (
    "id" INTEGER NOT NULL,
    "hasMultipleTimeSlots" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "availableDaysOfWeek" "DaysInWeek"[] DEFAULT ARRAY[]::"DaysInWeek"[],

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailableDate" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "productId" INTEGER NOT NULL,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "finalPrice" DOUBLE PRECISION NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailableDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeSlot" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "TimeSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeSlotAvailability" (
    "id" SERIAL NOT NULL,
    "availableDateId" INTEGER NOT NULL,
    "timeSlotId" INTEGER NOT NULL,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "finalPrice" DOUBLE PRECISION NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "remaining" INTEGER NOT NULL,

    CONSTRAINT "TimeSlotAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaxType" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "minQuantity" INTEGER,
    "maxQuantity" INTEGER,

    CONSTRAINT "PaxType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaxAvailability" (
    "id" SERIAL NOT NULL,
    "timeSlotAvailabilityId" INTEGER NOT NULL,
    "paxTypeId" INTEGER NOT NULL,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "finalPrice" DOUBLE PRECISION NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "remaining" INTEGER NOT NULL,

    CONSTRAINT "PaxAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FetchTracker" (
    "id" SERIAL NOT NULL,
    "fetchType" "FetchTypes" NOT NULL,
    "lastFetched" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FetchTracker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvailableDate_date_idx" ON "AvailableDate"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AvailableDate_productId_date_key" ON "AvailableDate"("productId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TimeSlot_productId_startTime_key" ON "TimeSlot"("productId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "TimeSlotAvailability_availableDateId_timeSlotId_key" ON "TimeSlotAvailability"("availableDateId", "timeSlotId");

-- CreateIndex
CREATE UNIQUE INDEX "PaxType_productId_type_key" ON "PaxType"("productId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "PaxAvailability_timeSlotAvailabilityId_paxTypeId_key" ON "PaxAvailability"("timeSlotAvailabilityId", "paxTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "FetchTracker_fetchType_key" ON "FetchTracker"("fetchType");

-- AddForeignKey
ALTER TABLE "AvailableDate" ADD CONSTRAINT "AvailableDate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeSlot" ADD CONSTRAINT "TimeSlot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeSlotAvailability" ADD CONSTRAINT "TimeSlotAvailability_availableDateId_fkey" FOREIGN KEY ("availableDateId") REFERENCES "AvailableDate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeSlotAvailability" ADD CONSTRAINT "TimeSlotAvailability_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "TimeSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaxType" ADD CONSTRAINT "PaxType_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaxAvailability" ADD CONSTRAINT "PaxAvailability_timeSlotAvailabilityId_fkey" FOREIGN KEY ("timeSlotAvailabilityId") REFERENCES "TimeSlotAvailability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaxAvailability" ADD CONSTRAINT "PaxAvailability_paxTypeId_fkey" FOREIGN KEY ("paxTypeId") REFERENCES "PaxType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
