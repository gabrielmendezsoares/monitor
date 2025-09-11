# 🖥️ Monitor

## 📋 Overview

Monitor is a robust and extensible observability service designed to track and assess the health of distributed systems by querying registered API endpoints. It supports real-time evaluations, change detection, and flexible alerting through various channels such as WhatsApp.

By querying centralized API Gateway sources, Monitor dynamically retrieves system status data, identifies added/removed/modified properties, and determines availability state changes. It offers structured insight into service health over time, reducing the need for manual checks while surfacing actionable performance signals.

### 🎯 Objectives

- Continuously check the health of registered applications through centralized API Gateway routes
- Detect and classify property-level changes: additions, modifications, removals
- Track service availability and log status transitions with timestamps
- Measure performance (e.g., response time) per monitored endpoint
- Format results into structured messages with rich context for alerting
- Deliver monitoring reports via WhatsApp or integrate with external dashboards
- Reduce manual oversight through automatic detection and reporting workflows
- Support flexible, pluggable architecture for easy expansion and environment customization

--- 

## 📦 Quick Start

### ⚠️ Prerequisites

- [**Node.js**](https://nodejs.org/) ≥ `20.14.0` — _JavaScript runtime environment_
- [**MySQL**](https://www.mysql.com/) ≥ `8.0` — _Relational database_
- [**API Gateway**](https://github.com/gabrielmendezsoares/api-gateway) ≥ `3.0.3` — _External API orchestration service_

### ⚙️ Setup 

```bash 
# Clone & navigate
git clone <repository-url> && cd monitor

# Configure environment
cp .env.example .env  # Edit with your settings

# Install dependencies (auto-runs database setup)
npm install
```

> **💡 Database:** Import `storage.sql.example` before running `npm install`

---

## ⚡ Usage

### 🛠️ Development

```bash
npm run start:development
```

### 🏗️ Production

```bash
npm run build && npm run start:production
```

---

## 📚 Command Reference

### 🧰 Core

| Command | Description |
| ------- | ----------- |
| `npm run start:development` | _Start the application in development_ |
| `npm run start:production` | _Start the application in production_ |
| `npm run build` | _Build the application for production_ |
| `npm run build:watch` | _Build the application with watch mode_ |
| `npm run clean` | _Clean application build artifacts_ |

### 🛢️ Database

| Command | Description |
| ------- | ----------- |
| `npm run db:pull` | _Pull database schema into Prisma across all schemas_ |
| `npm run db:push` | _Push Prisma schema to the database across all schemas_ |
| `npm run db:generate` | _Generate Prisma Client for all schemas_ |
| `npm run db:migrate:dev` | _Run development migrations across all schemas_ |
| `npm run db:migrate:deploy` | _Deploy migrations to production across all schemas_ |
| `npm run db:studio` | _Open Prisma Studio (GUI) across all schemas_ |
| `npm run db:reset` | _Reset database (pull + generate) for all schemas_ |

### 🐳 Docker

| Command | Description |
| ------- | ----------- |
| `npm run docker:build:development` | _Build Docker image for development_ |
| `npm run docker:build:production` | _Build Docker image for production_ |
| `npm run docker:run:development` | _Run development Docker container_ |
| `npm run docker:run:production` | _Run production Docker container_ |
| `npm run docker:compose:up:development` | _Start Docker Compose in development_ |
| `npm run docker:compose:up:production` | _Start Docker Compose in production_ |
| `npm run docker:compose:up:build:development` | _Start & rebuild Docker Compose in development_ |
| `npm run docker:compose:up:build:production` | _Start & rebuild Docker Compose in production_ |
| `npm run docker:compose:down` | _Stop Docker Compose services_ |
| `npm run docker:compose:logs` | _View Docker Compose logs_ |
| `npm run docker:prune` | _Clean up unused Docker resources_ |

### 🧪 Testing

| Command | Description |
| ------- | ----------- |
| `npm test` | _Run all tests once_ |
| `npm run test:watch` | _Run tests in watch mode_ |
| `npm run test:coverage` | _Run tests and generate a coverage report_ |
  