-- CreateTable
CREATE TABLE "tools" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "model_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "stores" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "base_url" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "price_listings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tool_id" INTEGER NOT NULL,
    "store_id" INTEGER NOT NULL,
    "price" REAL,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "product_url" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT false,
    "last_scraped_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "price_listings_tool_id_fkey" FOREIGN KEY ("tool_id") REFERENCES "tools" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "price_listings_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "tools_model_number_key" ON "tools"("model_number");

-- CreateIndex
CREATE UNIQUE INDEX "stores_base_url_key" ON "stores"("base_url");

-- CreateIndex
CREATE UNIQUE INDEX "price_listings_tool_id_store_id_key" ON "price_listings"("tool_id", "store_id");
