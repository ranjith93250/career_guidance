import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Create an in-memory store for when the database is not available
const inMemoryStore = {
  users: [
    // Add a test user for easy login during development
    {
      id: 1,
      name: "Test User",
      email: "test@example.com",
      password: "password",
      grade: 10,
      created_at: new Date().toISOString()
    }
  ],
  quizResults: [],
  completedSteps: [],
  favoriteJobs: [],
  viewedCareers: [],
  searchHistory: []
};

// Flag to track if we're using the in-memory store
let usingInMemoryStore = false;

// Create a pool with a lower connection timeout
let pool;
try {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'career_guidance',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 3000 // Set a lower timeout for faster fallback
  });
} catch (error) {
  console.error('Error creating MySQL pool:', error);
  usingInMemoryStore = true;
}

// Test the connection immediately
(async () => {
  if (!usingInMemoryStore) {
    try {
      // Try to get a connection
      const connection = await pool.getConnection();
      // If we got here, connection is successful
      console.log('Successfully connected to MySQL database');
      connection.release();
    } catch (error) {
      console.error('MySQL connection failed:', error);
      usingInMemoryStore = true;
      console.log('Switching to in-memory store');
    }
  }
})();

// Mock connection for in-memory store
const createMockConnection = () => {
  return {
    execute: async (query, params = []) => {
      console.log('Executing mock query:', query.substring(0, 60) + '...');
      
      // Handle different queries
      if (query.includes('INSERT INTO users')) {
        const [name, email, password, grade] = params;
        
        // Check if user already exists in in-memory store
        const existingUser = inMemoryStore.users.find(user => user.email === email);
        if (existingUser) {
          return [[existingUser]]; // User already exists
        }
        
        const id = inMemoryStore.users.length + 1;
        const newUser = { 
          id, 
          name, 
          email, 
          password, 
          grade: parseInt(grade), 
          created_at: new Date().toISOString() 
        };
        
        inMemoryStore.users.push(newUser);
        return [{ insertId: id }];
      }
      
      if (query.includes('SELECT * FROM users WHERE email = ?')) {
        const email = params[0];
        const users = inMemoryStore.users.filter(user => user.email === email);
        return [users];
      }
      
      if (query.includes('SELECT * FROM users WHERE email = ? AND password = ?')) {
        const [email, password] = params;
        const users = inMemoryStore.users.filter(
          user => user.email === email && user.password === password
        );
        return [users];
      }
      
      if (query.includes('INSERT INTO quiz_results')) {
        const [userId, quizData, suggestedCareers] = params;
        const id = inMemoryStore.quizResults.length + 1;
        
        inMemoryStore.quizResults.push({
          id,
          user_id: userId,
          quiz_data: quizData,
          suggested_careers: suggestedCareers,
          created_at: new Date().toISOString()
        });
        
        return [{ insertId: id }];
      }
      
      if (query.includes('SELECT * FROM quiz_results WHERE user_id = ?')) {
        const userId = params[0];
        const results = inMemoryStore.quizResults.filter(
          result => result.user_id === userId
        ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        return [results];
      }
      
      if (query.includes('INSERT INTO completed_steps')) {
        const [userId, careerTitle, stepIndex] = params;
        
        // Check if step is already completed
        const existingStep = inMemoryStore.completedSteps.find(
          step => step.user_id === userId && 
                 step.career_title === careerTitle && 
                 step.step_index === stepIndex
        );
        
        if (existingStep) {
          existingStep.completed_at = new Date().toISOString();
        } else {
          const id = inMemoryStore.completedSteps.length + 1;
          inMemoryStore.completedSteps.push({
            id,
            user_id: userId,
            career_title: careerTitle,
            step_index: stepIndex,
            completed_at: new Date().toISOString()
          });
        }
        
        return [{ affectedRows: 1 }];
      }
      
      if (query.includes('DELETE FROM completed_steps')) {
        const [userId, careerTitle, stepIndex] = params;
        
        const initialLength = inMemoryStore.completedSteps.length;
        inMemoryStore.completedSteps = inMemoryStore.completedSteps.filter(
          step => !(step.user_id === userId && 
                   step.career_title === careerTitle && 
                   step.step_index === stepIndex)
        );
        
        return [{ affectedRows: initialLength - inMemoryStore.completedSteps.length }];
      }
      
      if (query.includes('SELECT step_index FROM completed_steps')) {
        const [userId, careerTitle] = params;
        
        const steps = inMemoryStore.completedSteps.filter(
          step => step.user_id === userId && step.career_title === careerTitle
        ).map(step => ({ step_index: step.step_index }));
        
        return [steps];
      }
      
      // Default empty response for unhandled queries
      return [[]];
    },
    release: () => {
      // Mock release method
    }
  };
};

// Initialize database with required tables
const initializeDb = async () => {
  if (usingInMemoryStore) {
    console.log('Using in-memory store instead of MySQL database');
    return;
  }
  
  try {
    const connection = await pool.getConnection();
    
    // Create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        grade INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create quiz_results table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS quiz_results (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        quiz_data TEXT NOT NULL,
        suggested_careers TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Create completed_steps table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS completed_steps (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        career_title VARCHAR(255) NOT NULL,
        step_index INT NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY user_career_step (user_id, career_title, step_index)
      )
    `);
    
    // Create favorite_jobs table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS favorite_jobs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        job_title VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY user_job (user_id, job_title)
      )
    `);
    
    // Create viewed_careers table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS viewed_careers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        career_title VARCHAR(255) NOT NULL,
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    // Create search_history table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS search_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        query VARCHAR(255) NOT NULL,
        searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    connection.release();
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    usingInMemoryStore = true;
    console.log('Falling back to in-memory store');
  }
};

// Delay initialization slightly to allow connection check to complete first
setTimeout(initializeDb, 1000);

// Export getConnection function that works with either real pool or mock connection
export const getConnection = async () => {
  if (usingInMemoryStore) {
    return createMockConnection();
  }
  
  try {
    return await pool.getConnection();
  } catch (error) {
    console.error('Error getting database connection:', error);
    usingInMemoryStore = true;
    console.log('Falling back to in-memory store for this connection');
    return createMockConnection();
  }
};

export default {
  getConnection,
  get usingInMemoryStore() {
    return usingInMemoryStore;
  }
}; 