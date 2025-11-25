const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();

// Prisma client with connection pooling for serverless
const globalForPrisma = global;
const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Middleware
app.use(express.json());

// Helper function to validate URL
function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Helper function to validate code format [A-Za-z0-9]{6,8}
function isValidCode(code) {
  return /^[A-Za-z0-9]{6,8}$/.test(code);
}

// Helper function to generate random code
function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const length = Math.floor(Math.random() * 3) + 6;
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ============ HEALTH CHECK ============
app.get('/api/healthz', (req, res) => {
  res.status(200).json({ ok: true, version: '1.0' });
});

// Also support /healthz
app.get('/healthz', (req, res) => {
  res.status(200).json({ ok: true, version: '1.0' });
});

// ============ API ROUTES ============

// GET /api/links - List all links
app.get('/api/links', async (req, res) => {
  try {
    const links = await prisma.link.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        code: true,
        url: true,
        clicks: true,
        lastClickedAt: true,
        createdAt: true,
      },
    });
    res.json(links);
  } catch (error) {
    console.error('Error fetching links:', error);
    res.status(500).json({ error: 'Failed to fetch links' });
  }
});

// POST /api/links - Create a new short link
app.post('/api/links', async (req, res) => {
  try {
    const { url, code: customCode } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!isValidUrl(url)) {
      return res.status(400).json({ error: 'Invalid URL. Must start with http:// or https://' });
    }

    let code;

    if (customCode) {
      if (!isValidCode(customCode)) {
        return res.status(400).json({ error: 'Code must be 6-8 alphanumeric characters [A-Za-z0-9]' });
      }

      const existing = await prisma.link.findUnique({ where: { code: customCode } });
      if (existing) {
        return res.status(409).json({ error: 'Code already exists' });
      }

      code = customCode;
    } else {
      let isUnique = false;
      let attempts = 0;
      code = generateCode();

      while (!isUnique && attempts < 10) {
        const existing = await prisma.link.findUnique({ where: { code } });
        if (!existing) {
          isUnique = true;
        } else {
          code = generateCode();
          attempts++;
        }
      }

      if (!isUnique) {
        return res.status(500).json({ error: 'Failed to generate unique code. Please try again.' });
      }
    }

    const link = await prisma.link.create({
      data: { code, url },
    });

    res.status(201).json({
      id: link.id,
      code: link.code,
      url: link.url,
      clicks: link.clicks,
      lastClickedAt: link.lastClickedAt,
      createdAt: link.createdAt,
    });
  } catch (error) {
    console.error('Error creating link:', error);
    res.status(500).json({ error: 'Failed to create link' });
  }
});

// GET /api/links/:code - Get stats for a single link
app.get('/api/links/:code', async (req, res) => {
  try {
    const link = await prisma.link.findUnique({
      where: { code: req.params.code },
      include: {
        visits: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    res.json(link);
  } catch (error) {
    console.error('Error fetching link:', error);
    res.status(500).json({ error: 'Failed to fetch link' });
  }
});

// DELETE /api/links/:code - Delete a link
app.delete('/api/links/:code', async (req, res) => {
  try {
    const link = await prisma.link.findUnique({ where: { code: req.params.code } });

    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    await prisma.link.delete({ where: { code: req.params.code } });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

// GET /api/stats - Get overall statistics
app.get('/api/stats', async (req, res) => {
  try {
    const totalLinks = await prisma.link.count();

    const clicksResult = await prisma.link.aggregate({
      _sum: { clicks: true },
    });
    const totalClicks = clicksResult._sum.clicks || 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const clicksToday = await prisma.visit.count({
      where: { createdAt: { gte: today } },
    });

    const topLink = await prisma.link.findFirst({
      orderBy: { clicks: 'desc' },
      select: { code: true, clicks: true },
    });

    res.json({
      totalLinks,
      totalClicks,
      clicksToday,
      topLink: topLink && topLink.clicks > 0 ? topLink : null,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Export for Vercel serverless
module.exports = app;

