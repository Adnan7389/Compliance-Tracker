# Compliance Tracker

A full-stack application to help businesses track and manage their compliance tasks.

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

### Frontend

*   React
*   Vite
*   Tailwind CSS
*   Axios
*   React Router

### Backend

*   Node.js
*   Express
*   PostgreSQL
*   JWT for authentication
*   bcryptjs for password hashing

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
    cd server
    npm install
    ```

3.  **Install client dependencies:**

    ```bash
    cd ../client
    npm install
    ```

4.  **Set up the database:**

    *   Create a PostgreSQL database.
    *   Connect to the database and run the `schema.sql` file to create the tables.

    ```bash
    psql -U your_username -d your_database_name -f server/schema.sql
    ```

5.  **Configure environment variables:**

    *   In the `server` directory, create a `.env` file and add the following:

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
    cd server
    npm start
    ```

2.  **Start the client:**

    ```bash
    cd ../client
    npm run dev
    ```

## Database Schema

The database schema is defined in `server/schema.sql`. It consists of the following tables:

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
