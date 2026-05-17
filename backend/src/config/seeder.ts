import { PrismaClient } from '@prisma/client';
import { loadStores, loadTools } from './loader';

export async function seedDatabase(prisma: PrismaClient): Promise<void> {
  const stores = loadStores();
  const tools = loadTools();

  // Upsert stores
  for (const s of stores) {
    await prisma.store.upsert({
      where: { baseUrl: s.base_url },
      update: { name: s.name, isActive: s.is_active },
      create: { name: s.name, baseUrl: s.base_url, isActive: s.is_active },
    });
  }

  // Mark stores not in config as inactive
  const configUrls = stores.map((s) => s.base_url);
  await prisma.store.updateMany({
    where: { baseUrl: { notIn: configUrls } },
    data: { isActive: false },
  });

  // Upsert tools
  for (const t of tools) {
    await prisma.tool.upsert({
      where: { modelNumber: t.model_number },
      update: {
        name: t.name,
        category: t.category,
        description: t.description ?? null,
        imageUrl: t.image_url ?? null,
        isActive: true,
      },
      create: {
        modelNumber: t.model_number,
        name: t.name,
        category: t.category,
        description: t.description ?? null,
        imageUrl: t.image_url ?? null,
        isActive: true,
      },
    });
  }

  // Mark tools not in config as inactive
  const configModels = tools.map((t) => t.model_number);
  await prisma.tool.updateMany({
    where: { modelNumber: { notIn: configModels } },
    data: { isActive: false },
  });

  console.log(
    `[seeder] Synced ${stores.length} store(s) and ${tools.length} tool(s) from config`
  );
}
