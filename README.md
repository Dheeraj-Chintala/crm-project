# CRM Project

A comprehensive CRM (Customer Relationship Management) application built with React, TypeScript, Vite, and Supabase.

## Features

- **Lead Management**: Track and manage leads through various statuses.
- **Contact Management**: Store and organize contact information.
- **Deal Tracking**: Manage deals, pipelines, and stages with visual boards.
- **Task Management**: Create and assign tasks, track due dates, and view overdue items.
- **Reports & Analytics**: Visual insights into lead conversion, deal pipelines, and activity trends.
- **Role-Based Access Control (RBAC)**: Secure access for Admins, Managers, and standard Users.
- **Audit Logging**: Track important system actions and changes.

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **UI Framework**: Tailwind CSS, shadcn/ui
- **Icons**: Lucide React
- **Charts**: Recharts
- **Backend/Database**: Supabase (PostgreSQL, Auth, Realtime)
- **State Management**: React Context, TanStack Query

## Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- A Supabase project (for backend)

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd <project-directory>
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Configuration

```bash
Not needed
```


### 4. Database Setup

Ensure your Supabase project is set up with the required schema. You can find migration files in the `supabase/migrations` directory.

### 5. Run the Application

Start the development server:

```bash
npm run dev
```

The application will start on **port 8080**.

> **Note**: The port is configured to `8080` in `vite.config.ts`. If this port is occupied, you can change it in the config file.

Open your browser and navigate to:
[http://localhost:8080](http://localhost:8080)

