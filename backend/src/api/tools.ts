import { Router, Request, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';

type ToolWithListings = Prisma.ToolGetPayload<{
  include: {
    listings: {
      include: { store: { select: { id: true; name: true } } };
      orderBy: [{ isAvailable: 'desc' }, { price: 'asc' }];
    };
  };
}>;

export default function toolsRouter(prisma: PrismaClient): Router {
  const router = Router();

  // GET /api/tools
  router.get('/', async (req: Request, res: Response) => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;

      const tools = await prisma.tool.findMany({
        where: {
          isActive: true,
          ...(category ? { category } : {}),
          ...(q
            ? {
                OR: [
                  { name: { contains: q } },
                  { modelNumber: { contains: q } },
                ],
              }
            : {}),
        },
        include: {
          listings: {
            where: { isAvailable: true },
            orderBy: { price: 'asc' },
            take: 1,
            include: { store: { select: { name: true } } },
          },
        },
        orderBy: { name: 'asc' },
      });

      const data = tools.map((tool) => {
        const cheapest = tool.listings[0] ?? null;
        return {
          id: tool.id,
          model_number: tool.modelNumber,
          name: tool.name,
          category: tool.category,
          image_url: tool.imageUrl,
          lowest_price: cheapest?.price ?? null,
          lowest_price_store: cheapest?.store.name ?? null,
          currency: cheapest?.currency ?? 'ILS',
          listing_count: tool.listings.length,
        };
      });

      res.json({ data });
    } catch (err) {
      console.error('[GET /api/tools]', err);
      res.status(500).json({ error: 'Failed to fetch tools' });
    }
  });

  // GET /api/tools/:modelNumber
  router.get('/:modelNumber', async (req: Request<{ modelNumber: string }>, res: Response) => {
    try {
      const { modelNumber } = req.params;

      const tool = await prisma.tool.findUnique({
        where: { modelNumber },
        include: {
          listings: {
            include: { store: { select: { id: true, name: true } } },
            orderBy: [
              { isAvailable: 'desc' },
              { price: 'asc' },
            ],
          },
        },
      });

      if (!tool || !tool.isActive) {
        res.status(404).json({ error: 'Tool not found', model_number: modelNumber });
        return;
      }

      const t = tool as ToolWithListings;
      const data = {
        id: t.id,
        model_number: t.modelNumber,
        name: t.name,
        category: t.category,
        image_url: t.imageUrl,
        description: t.description,
        listings: t.listings.map((l) => ({
          store_id: l.store.id,
          store_name: l.store.name,
          price: l.price,
          currency: l.currency,
          product_url: l.productUrl,
          is_available: l.isAvailable,
          last_scraped_at: l.lastScrapedAt?.toISOString() ?? null,
        })),
      };

      res.json({ data });
    } catch (err) {
      console.error('[GET /api/tools/:modelNumber]', err);
      res.status(500).json({ error: 'Failed to fetch tool' });
    }
  });

  return router;
}
