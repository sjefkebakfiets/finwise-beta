CREATE TABLE "MortgagePayment" (
    "id" TEXT NOT NULL,
    "mortgageId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "interestAmount" DECIMAL(18,2) NOT NULL,
    "principalAmount" DECIMAL(18,2) NOT NULL,
    "extraPrincipal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxReliefEstimate" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MortgagePayment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MortgagePayment_mortgageId_date_idx" ON "MortgagePayment"("mortgageId", "date");
ALTER TABLE "MortgagePayment" ADD CONSTRAINT "MortgagePayment_mortgageId_fkey" FOREIGN KEY ("mortgageId") REFERENCES "Mortgage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
