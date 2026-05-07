# Rosanah Cleaners Management System

A full-stack mobile-first PWA for managing a laundry/dry cleaning business.

## Quick Start

```bash
# Install all dependencies
cd backend && npm install
cd ../frontend && npm install

# Start development (both servers)
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm run dev
```

Open: http://localhost:3000

## First-Time Access

- On first launch, complete the setup wizard to create your administrator account.
- Default seed credentials are intended for initial local bootstrapping only and should not be used in production documentation.
- Use the in-app password reset flow (or the backend `reset-password` script) for account recovery.

## Features

- **Dashboard** — Daily stats, revenue, order counts
- **New Order** — Customer lookup + dynamic item pricing
- **Operations Board** — Pickup → Cleaning → Ready pipeline
- **Delivery** — Driver delivery list with one-tap confirm
- **Customers** — Search + full order history
- **Reports** — Daily & payment reports with CSV export
- **Settings** — Pricing, users, message templates
- **WhatsApp Integration** — One-tap deep links for each status update

## Status Pipeline

```
Pending Pickup → Picked → Cleaning → Ready → Paid → Delivered
```

## Tech Stack

- Backend: Node.js + Express + SQLite (better-sqlite3)
- Frontend: React + Vite
- Auth: JWT
- PWA: Web App Manifest
