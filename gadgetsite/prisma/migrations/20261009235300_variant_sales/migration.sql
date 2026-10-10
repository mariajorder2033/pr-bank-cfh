-- AlterTable
ALTER TABLE "variants" ADD COLUMN     "saleEndsAt" TIMESTAMP(3),
ADD COLUMN     "salePrice" INTEGER,
ADD COLUMN     "saleStartsAt" TIMESTAMP(3);
