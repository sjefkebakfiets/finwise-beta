-- Add optional maturity and fixed-rate expiry dates without changing existing records.
ALTER TABLE "Mortgage" ADD COLUMN "endDate" TIMESTAMP(3);
ALTER TABLE "Mortgage" ADD COLUMN "fixedRateEndDate" TIMESTAMP(3);
