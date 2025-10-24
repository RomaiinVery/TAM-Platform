-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "kyc" INTEGER NOT NULL DEFAULT 0
);
INSERT INTO "new_User" ("adresse", "firstname", "id", "lastname") SELECT "adresse", "firstname", "id", "lastname" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_adresse_key" ON "User"("adresse");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
