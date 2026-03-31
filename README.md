# ExpenseTracker

A full-stack personal expense tracking application with category management, receipt uploads, and monthly spending analytics.

## Tech Stack

**Backend**
- Java 17, Spring Boot 3.2
- PostgreSQL
- Spring Data JPA / Hibernate
- AWS S3 for receipt storage
- Maven

**Frontend**
- React 19 + Vite
- Tailwind CSS v4
- Recharts (charts)
- Axios (HTTP client)
- Lucide React (icons)
- Day.js (dates)

## Getting Started

### Prerequisites

- Java 17+
- Maven 3.8+
- Node.js 18+
- PostgreSQL 14+
- AWS S3 bucket (for receipt uploads)

### Database Setup

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE expense_tracker;"
```

### Backend

```bash
cd backend

# Set environment variables (or use defaults)
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=expense_tracker
export DB_USER=postgres
export DB_PASS=postgres
export AWS_S3_BUCKET=expense-tracker-receipts
export AWS_REGION=ap-south-1
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret

# Run
./mvnw spring-boot:run
```

The API starts at `http://localhost:8080/api`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `expense_tracker` | Database name |
| `DB_USER` | `postgres` | Database user |
| `DB_PASS` | `postgres` | Database password |
| `AWS_S3_BUCKET` | `expense-tracker-receipts` | S3 bucket for receipts |
| `AWS_REGION` | `ap-south-1` | AWS region |
| `AWS_ACCESS_KEY_ID` | — | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | — | AWS secret key |

## Default Categories

The following categories are seeded on first run:

| Category |
|---|---|
| Food |
| Transport |
| Shopping |
| Bills |
| Entertainment |
| Health |
| Education |
| Other |
| Groceries |
| Subscriptions |

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/categories` | List all categories |
| `POST` | `/api/categories` | Create a category |
| `DELETE` | `/api/categories/:id` | Delete a category |
| `GET` | `/api/transactions` | List transactions (optional `month`, `year`, `categoryId`) |
| `POST` | `/api/transactions` | Create a transaction |
| `PUT` | `/api/transactions/:id` | Update a transaction |
| `DELETE` | `/api/transactions/:id` | Delete a transaction |
| `GET` | `/api/transactions/summary/monthly` | Monthly spending summary |
| `POST` | `/api/transactions/:id/receipt` | Upload a receipt |
| `GET` | `/api/transactions/:id/receipt` | Download a receipt |
| `DELETE` | `/api/transactions/:id/receipt` | Delete a receipt |

## Screenshots

<!-- Add screenshots here -->
