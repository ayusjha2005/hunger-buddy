# HungerBuddy - Food Court App

## Stack
- **Frontend**: React + Vite → deployed on Vercel
- **Backend**: Node.js + Express → deployed on Render
- **Database**: MongoDB Atlas
- **C++ Engine**: compiled on Render at build time

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB running locally
- g++ (for C++ engine)

### Backend
```bash
cd backend
npm install
node server.js
# Runs on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5174
```

### Compile C++ Engine (Windows)
```bash
cd cpp_engine
g++ -O2 -std=c++17 -o engine.exe main.cpp
```

## Environment Variables

### Backend (.env)
```
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/foodcourt
FRONTEND_URL=https://your-app.vercel.app
```

### Frontend (.env.production)
```
VITE_API_URL=https://your-backend.onrender.com
```
