# OnTrack

A modern time-tracking application for employees to track time spent on tasks and visualize progress.

## Features

- **Dashboard**: Weekly overview of time spent vs. estimated time
- **Tasks Library**: Create and manage tasks with customer, budget, and time estimates
- **Time Tracking**: Daily time entry with autocomplete task search
- **Activity Log**: Complete history of all time entries

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **State**: Zustand
- **Database**: IndexedDB (Dexie.js)
- **Charts**: Recharts
- **Icons**: Lucide React

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Data Storage

All data is stored locally in IndexedDB. No data leaves your device.

## Deployment

### Netlify Deployment

This app is configured for static hosting on Netlify.

```bash
# Build for production
npm run build

# Output directory: out/
```

The `netlify.toml` configuration includes:
- **SPA routing**: All routes redirect to index.html (survives page reloads)
- **Security headers**: X-Frame-Options, CSP, HSTS, etc.
- **Cache optimization**: Static assets cached for 1 year

To deploy:
1. Connect your repository to Netlify
2. Build command: `npm run build`
3. Publish directory: `out`
4. Deploy!
