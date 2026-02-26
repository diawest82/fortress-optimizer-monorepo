-- DropForeignKey
ALTER TABLE "email_replies" DROP CONSTRAINT "email_replies_userId_fkey";

-- AlterTable
ALTER TABLE "email_replies" ALTER COLUMN "userId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "email_replies" ADD CONSTRAINT "email_replies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
