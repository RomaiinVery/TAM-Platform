-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "adresse" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_adresse_key" ON "User"("adresse");
