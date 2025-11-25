# LinkSnap - URL Shortener

A modern URL shortener built with Node.js, Express, and PostgreSQL. Create short links, track clicks, and manage your URLs.

## Features

- 🔗 **Shorten URLs** - Create short, memorable links instantly
- 📊 **Click Analytics** - Track clicks with detailed statistics
- 🎨 **Custom Codes** - Create branded links with custom short codes (6-8 alphanumeric)
- 📱 **Responsive Design** - Works beautifully on all devices
- ⚡ **Lightning Fast** - Built on Node.js with optimized performance

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon)
- **ORM**: Prisma
- **Hosting**: Vercel

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/healthz` | Health check - returns `{ ok: true, version: "1.0" }` |
| `POST` | `/api/links` | Create link (409 if code exists) |
| `GET` | `/api/links` | List all links |
| `GET` | `/api/links/:code` | Stats for one code |
| `DELETE` | `/api/links/:code` | Delete link |

## Pages

| Path | Purpose |
|------|---------|
| `/` | Dashboard (list, add, delete) |
| `/code/:code` | Stats page for a single link |
| `/:code` | Redirect (302) or 404 |

## Local Development

### Prerequisites

- Node.js 18+
- A Neon database account (free at [neon.tech](https://neon.tech))

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/linksnap.git
cd linksnap
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```env
DATABASE_URL="postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"
```

4. Push the database schema:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel + Neon

### Step 1: Set up Neon Database

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy the connection string from the dashboard

### Step 2: Deploy to Vercel

1. Push your code to GitHub

2. Go to [vercel.com](https://vercel.com) and import your repository

3. Add environment variable:
   - `DATABASE_URL` = your Neon connection string

4. Deploy!

### Step 3: Initialize Database

After first deployment, the database tables will be created automatically via the `vercel-build` script.

## Project Structure

```
├── server.js           # Main Express server
├── package.json        # Dependencies and scripts
├── vercel.json         # Vercel deployment config
├── prisma/
│   └── schema.prisma   # Database schema
└── public/
    ├── index.html      # Dashboard page
    ├── stats.html      # Stats page
    ├── css/
    │   └── styles.css  # All styles
    └── js/
        ├── dashboard.js # Dashboard JavaScript
        └── stats.js     # Stats page JavaScript
```

## License

MIT License
