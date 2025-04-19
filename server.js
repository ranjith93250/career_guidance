import express from 'express';
import cors from 'cors';
import session from 'express-session';
import MySQLStore from 'express-mysql-session';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import db from './src/config/db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'], // Allow multiple Vite dev server ports
  credentials: true
}));
app.use(express.json());

// Add debugging middleware after express.json() middleware
app.use((req, res, next) => {
  console.log(`[DEBUG] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('[DEBUG] Request body:', JSON.stringify(req.body, null, 2).substring(0, 200) + (JSON.stringify(req.body).length > 200 ? '...' : ''));
  }
  
  // Capture the original res.json to intercept the response
  const originalJson = res.json;
  res.json = function(data) {
    console.log(`[DEBUG] Response (${res.statusCode}):`, JSON.stringify(data, null, 2).substring(0, 200) + (JSON.stringify(data).length > 200 ? '...' : ''));
    return originalJson.call(this, data);
  };
  
  next();
});

// Session store setup
let sessionStore;

// If we're using the in-memory store, use MemoryStore for sessions immediately
if (db.usingInMemoryStore) {
  console.log("Using in-memory session store");
  const MemoryStore = session.MemoryStore;
  sessionStore = new MemoryStore();
} else {
  // Otherwise try to use MySQL for sessions with a fallback to MemoryStore
  try {
    // Create a custom session store that won't fail when the database is down
    const MemoryStore = session.MemoryStore;
    const memoryFallback = new MemoryStore();
    
    // Try to create MySQL store, but catch any errors
    try {
      const MySQLStoreSession = MySQLStore(session);
      sessionStore = new MySQLStoreSession({
        checkExpirationInterval: 900000, // 15 minutes
        expiration: 86400000, // 1 day
        createDatabaseTable: true,
        schema: {
          tableName: 'sessions',
          columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
          }
        }
      }, mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'career_guidance',
        connectTimeout: 3000 // Set a lower timeout for faster fallback
      }));
      
      // Override the get/set/destroy methods to use memory fallback on error
      const originalGet = sessionStore.get;
      sessionStore.get = function(sid, cb) {
        originalGet.call(this, sid, (err, session) => {
          if (err) {
            console.log("MySQL session store error, using memory fallback for get");
            return memoryFallback.get(sid, cb);
          }
          cb(null, session);
        });
      };
      
      const originalSet = sessionStore.set;
      sessionStore.set = function(sid, session, cb) {
        originalSet.call(this, sid, session, (err) => {
          if (err) {
            console.log("MySQL session store error, using memory fallback for set");
            return memoryFallback.set(sid, session, cb);
          }
          cb();
        });
      };
      
      const originalDestroy = sessionStore.destroy;
      sessionStore.destroy = function(sid, cb) {
        originalDestroy.call(this, sid, (err) => {
          if (err) {
            console.log("MySQL session store error, using memory fallback for destroy");
            return memoryFallback.destroy(sid, cb);
          }
          cb();
        });
      };
    } catch (error) {
      console.error("Error creating MySQL session store:", error);
      sessionStore = memoryFallback;
    }
  } catch (error) {
    console.error("Error setting up session store:", error);
    const MemoryStore = session.MemoryStore;
    sessionStore = new MemoryStore();
  }
}

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'career-guidance-session-secret',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// API Routes

// User registration
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, grade } = req.body;
    
    if (!name || !email || !password || !grade) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    const connection = await db.getConnection();
    
    // Check if user already exists
    const [existingUsers] = await connection.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      connection.release();
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Create new user
    const [result] = await connection.execute(
      'INSERT INTO users (name, email, password, grade) VALUES (?, ?, ?, ?)',
      [name, email, password, grade]
    );
    
    connection.release();
    
    // Set user session
    req.session.user = {
      id: result.insertId,
      name,
      email,
      grade
    };
    
    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: result.insertId,
        name,
        email,
        grade
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    const connection = await db.getConnection();
    
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE email = ? AND password = ?',
      [email, password]
    );
    
    connection.release();
    
    if (users.length === 0) {
      // Check if user exists but password is wrong
      const [existingUsers] = await connection.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      
      if (existingUsers.length === 0) {
        return res.status(404).json({ message: 'You are not registered. Please create an account.' });
      } else {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    }
    
    const user = users[0];
    
    // Set user session
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      grade: user.grade
    };
    
    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        grade: user.grade
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// User logout
app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out' });
    }
    
    res.clearCookie('connect.sid');
    return res.status(200).json({ message: 'Logout successful' });
  });
});

// Save quiz results
app.post('/api/quiz/save', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { quizData, suggestedCareers } = req.body;
    const userId = req.session.user.id;
    
    if (!db.usingInMemoryStore) {
      const connection = await db.getConnection();
      
      await connection.execute(
        'INSERT INTO quiz_results (user_id, quiz_data, suggested_careers) VALUES (?, ?, ?)',
        [userId, JSON.stringify(quizData), JSON.stringify(suggestedCareers)]
      );
      
      connection.release();
    }
    
    return res.status(201).json({ message: 'Quiz results saved successfully' });
  } catch (error) {
    console.error('Error saving quiz results:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Check if user has completed the quiz
app.get('/api/quiz/has-completed/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    
    // If using in-memory store, we can't check
    if (db.usingInMemoryStore) {
      return res.status(200).json({ hasCompleted: false });
    }
    
    const connection = await db.getConnection();
    
    // First get the user ID
    const [users] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      connection.release();
      return res.status(200).json({ hasCompleted: false });
    }
    
    const userId = users[0].id;
    
    // Then check if they have quiz results
    const [results] = await connection.execute(
      'SELECT COUNT(*) as count FROM quiz_results WHERE user_id = ?',
      [userId]
    );
    
    connection.release();
    
    const hasCompleted = results[0].count > 0;
    
    return res.status(200).json({ hasCompleted });
  } catch (error) {
    console.error('Error checking quiz completion status:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's quiz history
app.get('/api/quiz/history', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // For now, return empty history if using in-memory mode
    if (db.usingInMemoryStore) {
      return res.status(200).json({
        message: 'Quiz history retrieved successfully',
        quizHistory: []
      });
    }
    
    const userId = req.session.user.id;
    const connection = await db.getConnection();
    
    const [results] = await connection.execute(
      'SELECT * FROM quiz_results WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    
    connection.release();
    
    return res.status(200).json({
      message: 'Quiz history retrieved successfully',
      quizHistory: results.map(result => ({
        id: result.id,
        quizData: JSON.parse(result.quiz_data),
        suggestedCareers: JSON.parse(result.suggested_careers),
        createdAt: result.created_at
      }))
    });
  } catch (error) {
    console.error('Error retrieving quiz history:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Clear quiz data when retaking quiz
app.post('/api/quiz/clear', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.session.user.id;
    const { grade } = req.body;
    
    console.log(`Clearing quiz data for user ${userId} with grade ${grade}`);
    
    if (!db.usingInMemoryStore) {
      const connection = await db.getConnection();
      
      // Delete quiz results for this user
      await connection.execute(
        'DELETE FROM quiz_results WHERE user_id = ?',
        [userId]
      );
      
      // If grade is provided, update the user's grade
      if (grade) {
        await connection.execute(
          'UPDATE users SET grade = ? WHERE id = ?',
          [grade, userId]
        );
        
        // Update session grade
        req.session.user.grade = grade;
      }
      
      connection.release();
    } else {
      // In memory mode - just update session if grade provided
      if (grade) {
        req.session.user.grade = grade;
      }
    }
    
    return res.status(200).json({ 
      message: 'Quiz data cleared successfully',
      grade: grade ? grade : req.session.user.grade
    });
  } catch (error) {
    console.error('Error clearing quiz data:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Save completed step
app.post('/api/roadmap/complete-step', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { careerTitle, stepIndex } = req.body;
    const userId = req.session.user.id;
    
    if (!db.usingInMemoryStore) {
      const connection = await db.getConnection();
      
      await connection.execute(
        'INSERT INTO completed_steps (user_id, career_title, step_index) VALUES (?, ?, ?) ' +
        'ON DUPLICATE KEY UPDATE completed_at = CURRENT_TIMESTAMP',
        [userId, careerTitle, stepIndex]
      );
      
      connection.release();
    }
    
    return res.status(200).json({ message: 'Step marked as completed' });
  } catch (error) {
    console.error('Error saving completed step:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Remove completed step
app.delete('/api/roadmap/complete-step', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const { careerTitle, stepIndex } = req.body;
    const userId = req.session.user.id;
    
    if (!db.usingInMemoryStore) {
      const connection = await db.getConnection();
      
      await connection.execute(
        'DELETE FROM completed_steps WHERE user_id = ? AND career_title = ? AND step_index = ?',
        [userId, careerTitle, stepIndex]
      );
      
      connection.release();
    }
    
    return res.status(200).json({ message: 'Step marked as incomplete' });
  } catch (error) {
    console.error('Error removing completed step:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get completed steps for a career
app.get('/api/roadmap/completed-steps/:careerTitle', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Return empty array if using in-memory mode
    if (db.usingInMemoryStore) {
      return res.status(200).json({
        message: 'Completed steps retrieved successfully',
        completedSteps: []
      });
    }
    
    const { careerTitle } = req.params;
    const userId = req.session.user.id;
    
    const connection = await db.getConnection();
    
    const [steps] = await connection.execute(
      'SELECT step_index FROM completed_steps WHERE user_id = ? AND career_title = ?',
      [userId, careerTitle]
    );
    
    connection.release();
    
    return res.status(200).json({
      message: 'Completed steps retrieved successfully',
      completedSteps: steps.map(step => step.step_index)
    });
  } catch (error) {
    console.error('Error retrieving completed steps:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user data
app.get('/api/user', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  
  return res.status(200).json({
    message: 'User data retrieved successfully',
    user: req.session.user
  });
});

// Update user profile (including grade)
app.put('/api/user/update', async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.session.user.id;
    const updateData = req.body;
    
    // Ensure we only update allowed fields
    const allowedFields = ['name', 'grade'];
    const updateFields = {};
    
    // Filter allowed fields
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updateFields[field] = updateData[field];
      }
    }
    
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }
    
    if (!db.usingInMemoryStore) {
      const connection = await db.getConnection();
      
      // Build the dynamic SQL to update only provided fields
      const fieldsToUpdate = Object.keys(updateFields).map(field => `${field} = ?`).join(', ');
      const values = [...Object.values(updateFields), userId];
      
      await connection.execute(
        `UPDATE users SET ${fieldsToUpdate} WHERE id = ?`,
        values
      );
      
      connection.release();
      
      // Also update session data
      for (const field of Object.keys(updateFields)) {
        req.session.user[field] = updateFields[field];
      }
    } else {
      // In memory mode - just update the session
      for (const field of Object.keys(updateFields)) {
        req.session.user[field] = updateFields[field];
      }
    }
    
    return res.status(200).json({
      message: 'User profile updated successfully',
      user: req.session.user
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add OPTIONS handling for CORS preflight requests
app.options('*', cors());

// Add a healthcheck route
app.get('/api/healthcheck', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    mode: db.usingInMemoryStore ? 'in-memory' : 'database',
    session: req.session.id || 'no-session'
  });
});

// Start the server
const startServer = () => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Using ${db.usingInMemoryStore ? 'in-memory store' : 'MySQL database'}`);
  });
};

// Delay server start to ensure database connection status is determined
setTimeout(startServer, 1500); 