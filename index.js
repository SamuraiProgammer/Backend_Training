// server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require("cors")
const { connectDB } = require('./db/index.js');   // Adjust path if needed
//const UserRouter = require("./routes/user.route.js")
// Load environment variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

app.use(cors({
    origin: [
        'http://localhost:3000',      // React default
        'http://localhost:5174',      // Vite default
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'https://frontend-training-kappa.vercel.app'
        // Add your production frontend URL here later, e.g.:
        // 'https://your-frontend-domain.com'
    ],
    credentials: true,                // Allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    //allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware
app.use(express.json());

app.get("/", (req,res) => {
  res.send("api is running...")
})

// Routes
app.use('/api/auth', require('./routes/user.route.js'));

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`.yellow.bold);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    closeDB();           // Close DB connection
    console.log('Process terminated');
  });
});