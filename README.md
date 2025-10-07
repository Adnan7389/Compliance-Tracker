# Compliance Tracker Back-end

This is the back-end for the Compliance Tracker application. It is a Node.js application built with Express, and it uses PostgreSQL for the database.

## Features

*   User authentication (signup, login, logout) for business owners and staff.
*   Business owners can create and manage their business profile.
*   Owners can invite staff members to their business.
*   Create, assign, and track compliance tasks.
*   Categorize tasks (e.g., license, tax, safety).
*   Set due dates and recurrence for tasks.
*   Upload and manage documents related to tasks.
*   Dashboard to view upcoming and overdue tasks.

## Technologies Used

*   Node.js
*   Express
*   PostgreSQL
*   JWT for authentication
*   bcryptjs for password hashing
*   Jest for testing

## Getting Started

### Prerequisites

*   Node.js
*   PostgreSQL

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/compliance-tracker.git
    cd compliance-tracker
    ```

2.  **Install server dependencies:**

    ```bash
    npm install
    ```

3.  **Set up the database:**

    *   Create a PostgreSQL database.
    *   Connect to the database and run the `schema.sql` file to create the tables.

    ```bash
    psql -U your_username -d your_database_name -f schema.sql
    ```

4.  **Configure environment variables:**

    *   Create a `.env` file in the root directory and add the following:

    ```
    DB_USER=your_postgres_user
    DB_HOST=localhost
    DB_DATABASE=your_database_name
    DB_PASSWORD=your_postgres_password
    DB_PORT=5432
    JWT_SECRET=your_jwt_secret
    ```

### Running the Application

1.  **Start the server:**

    ```bash
    npm start
    ```

    Or for development with auto-reloading:

    ```bash
    npm run dev
    ```

## Testing

To run the tests, use the following command:

```bash
npm test
```

You can also run specific test suites:

```bash
npm run test:db
npm run test:models
npm run test:controllers
npm run test:routes
npm run test:middleware
```

## Database Schema

The database schema is defined in `schema.sql`. It consists of the following tables:

*   `users`: Stores user information (both owners and staff).
*   `businesses`: Stores business information.
*   `compliance_tasks`: Stores compliance tasks.
*   `documents`: Stores documents related to tasks.

## API Endpoints

### Auth

*   `POST /api/auth/signup` - Register a new user.
*   `POST /api/auth/login` - Login a user.

### Staff

*   `GET /api/staff` - Get all staff for a business.
*   `POST /api/staff` - Add a new staff member.
*   `DELETE /api/staff/:id` - Remove a staff member.

### Tasks

*   `GET /api/tasks` - Get all tasks for a business.
*   `GET /api/tasks/:id` - Get a single task.
*   `POST /api/tasks` - Create a new task.
*   `PUT /api/tasks/:id` - Update a task.
*   `DELETE /api/tasks/:id` - Delete a task.