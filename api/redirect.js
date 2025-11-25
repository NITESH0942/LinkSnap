const { PrismaClient } = require('@prisma/client');

// Prisma client with connection pooling for serverless
const globalForPrisma = global;
const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

module.exports = async (req, res) => {
  try {
    // Get code from URL path
    const url = new URL(req.url, `http://${req.headers.host}`);
    const code = url.pathname.slice(1); // Remove leading slash

    // Skip if empty or looks like a file/api request
    if (!code || code.includes('.') || code.startsWith('api') || code.startsWith('code')) {
      return res.status(404).json({ error: 'Not found' });
    }

    const link = await prisma.link.findUnique({ where: { code } });

    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    // Update click count and last clicked time, record visit
    const userAgent = req.headers['user-agent'] || null;
    const referer = req.headers['referer'] || null;

    await Promise.all([
      prisma.link.update({
        where: { id: link.id },
        data: { 
          clicks: { increment: 1 },
          lastClickedAt: new Date()
        },
      }),
      prisma.visit.create({
        data: { linkId: link.id, userAgent, referer },
      }),
    ]);

    // HTTP 302 redirect
    res.setHeader('Location', link.url);
    res.status(302).end();
  } catch (error) {
    console.error('Error handling redirect:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

