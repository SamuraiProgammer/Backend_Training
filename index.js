// server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require("cors")
const { connectDB, closeDB } = require('./db/index.js');   // Adjust path if needed
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
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'https://frontend-training-kappa.vercel.app',
        'https://admin-training-sigma.vercel.app/'
        // Add your production frontend URL here later, e.g.:
        // 'https://your-frontend-domain.com'
    ],
    credentials: true,                // Allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    //allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware
app.use(express.json());

// Routes
app.get("/",(req,res) => {
  res.send("Server is Running...")
})
app.use('/api/auth', require('./routes/user.route.js'));
app.use('/api/admin', require('./routes/admin.route.js'));
app.use('/api/course-detail', require('./routes/course.route.js'))
app.use('/api/offers', require('./routes/offer.route.js'))

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
