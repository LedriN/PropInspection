# PropInspect Dashboard

A modern property inspection management dashboard built with React, TypeScript, and Node.js.

## Features

- 🔐 **User Authentication** - Secure signup/login with JWT tokens
- 🏠 **Property Management** - Track and manage property portfolios
- 👥 **Client Management** - Manage client relationships
- 🔍 **Agent Management** - Coordinate inspection agents
- 📅 **Scheduling** - Calendar-based inspection scheduling
- 📊 **Reports** - Generate inspection reports
- 🔔 **Notifications** - Real-time updates and alerts
- 🗄️ **Multi-tenant** - Each user gets their own database

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React Router for navigation
- React Hot Toast for notifications
- Recharts for data visualization

### Backend
- Node.js with Express
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing
- CORS enabled

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd PropInspection-dashboard
```

### 2. Backend Setup
```bash
cd server
npm install
```

### 3. Environment Configuration

#### Backend Environment (.env in server folder)
Create `server/.env` file:
```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
# For MongoDB Atlas (cloud), use format like:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net?retryWrites=true&w=majority

# Server Configuration
PORT=5000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE=7d
```

#### Frontend Environment (.env in root folder)
Create `.env` file in the root directory:
```env
# Frontend Environment Variables
VITE_API_BASE_URL=http://localhost:5000/api
VITE_APP_NAME=PropInspect Dashboard
```

### 4. Start the Backend
```bash
cd server
npm run dev
```

### 5. Frontend Setup
```bash
# In the root directory
npm install
npm run dev
```

## Environment Variables

### Backend (.env in server folder)
- `MONGODB_URI` - MongoDB connection string (without database name)
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRE` - JWT token expiration time

### Frontend (.env in root folder)
- `VITE_API_BASE_URL` - Backend API base URL
- `VITE_APP_NAME` - Application name

## Database Structure

The application creates separate databases for each user:
- `propinspection_users` - Main database for user accounts
- `{username}` - Individual user databases (e.g., `ledrinushi`, `johnsmith`)

Each user database contains:
- Properties collection
- Clients collection
- Agents collection
- Inspections collection
- Reports collection

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Data Management
- `GET /api/properties` - Get all properties
- `POST /api/properties` - Create property
- `GET /api/clients` - Get all clients
- `POST /api/clients` - Create client
- `GET /api/agents` - Get all agents
- `POST /api/agents` - Create agent
- `GET /api/inspections` - Get all inspections
- `POST /api/inspections` - Create inspection
- `GET /api/reports` - Get all reports
- `POST /api/reports` - Create report

## Usage

1. **Sign Up** - Create a new account
2. **Login** - Access your dashboard
3. **Add Data** - Start adding properties, clients, and agents
4. **Schedule Inspections** - Use the calendar to schedule inspections
5. **Generate Reports** - Create inspection reports
6. **Manage** - Update and manage your data

## Development

### Project Structure
```
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Page components
│   ├── contexts/      # React contexts
│   ├── config/        # Configuration files
│   ├── services/      # API services
│   └── types/         # TypeScript type definitions
├── server/
│   ├── models/        # MongoDB models
│   ├── routes/        # API routes
│   ├── middleware/    # Express middleware
│   └── index.js       # Server entry point
└── public/            # Static assets
```

### Key Features
- **Multi-tenant Architecture** - Each user has isolated data
- **Responsive Design** - Works on desktop and mobile
- **Real-time Updates** - Live data synchronization
- **Secure Authentication** - JWT-based auth with password hashing
- **Error Handling** - Comprehensive error handling and fallbacks
- **Loading States** - User-friendly loading indicators
- **Empty States** - Helpful messages when no data exists

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
