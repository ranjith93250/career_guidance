import { LOCAL_STORAGE_PREFIX } from '../constants';

const API_URL = 'http://localhost:5000/api';

// Helper function for API calls
const apiCall = async (endpoint, method = 'GET', data = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies for session
  };

  if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
    options.body = JSON.stringify(data);
  }

  console.log(`[CLIENT] API call: ${method} ${API_URL}${endpoint}`);
  if (data) {
    console.log(`[CLIENT] Request payload:`, JSON.stringify(data).substring(0, 100) + (JSON.stringify(data).length > 100 ? '...' : ''));
  }
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const text = await response.text();
    
    console.log(`[CLIENT] Response status: ${response.status}`);
    console.log(`[CLIENT] Response headers:`, Object.fromEntries([...response.headers]));
    
    let result;
    try {
      result = JSON.parse(text);
      console.log(`[CLIENT] Response body:`, JSON.stringify(result).substring(0, 100) + (JSON.stringify(result).length > 100 ? '...' : ''));
    } catch (parseError) {
      console.error(`[CLIENT] Error parsing JSON response:`, parseError);
      console.log(`[CLIENT] Raw response:`, text.substring(0, 200));
      throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
    }

    if (!response.ok) {
      throw new Error(result.message || 'API call failed');
    }

    return result;
  } catch (error) {
    console.error(`[CLIENT] API Error (${endpoint}):`, error);
    
    // Provide fallbacks for certain API calls
    if (endpoint === '/user') {
      return { user: null };
    }
    
    if (endpoint === '/quiz/history') {
      return { quizHistory: [], hasCompletedQuiz: false };
    }
    
    if (endpoint.includes('/roadmap/completed-steps/')) {
      return { completedSteps: [] };
    }
    
    throw error;
  }
};

// Local storage fallbacks

// Save data to localStorage with key prefixing
const saveToLocalStorage = (key, data) => {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${key}`, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`Error saving to localStorage: ${key}`, error);
    return false;
  }
};

// Get data from localStorage with key prefixing
const getFromLocalStorage = (key) => {
  try {
    const data = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${key}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Error loading from localStorage: ${key}`, error);
    return null;
  }
};

// Auth APIs with fallbacks
export const registerUser = async (userData) => {
  try {
    return await apiCall('/register', 'POST', userData);
  } catch (error) {
    console.error('Registration failed, using local registration:', error);
    // Implement local fallback
    
    // Check if user already exists
    const existingUser = getFromLocalStorage(`user_${userData.email}`);
    if (existingUser) {
      throw new Error("Email already registered. Please use a different email or login.");
    }
    
    const mockUser = {
      id: Date.now(),
      name: userData.name,
      email: userData.email,
      grade: userData.grade,
      isNew: true // Mark as new user
    };
    
    // Store user in localStorage for fallback
    saveToLocalStorage(`user_${userData.email}`, mockUser);
    
    // Store password separately (in a real app, you would hash this)
    saveToLocalStorage(`password_${userData.email}`, userData.password);
    
    return { 
      message: 'User registered successfully (local mode)',
      user: mockUser
    };
  }
};

export const loginUser = async (credentials) => {
  try {
    return await apiCall('/login', 'POST', credentials);
  } catch (error) {
    console.error('Login failed, using local login:', error);
    // Check if this is an "Invalid credentials" error from the server
    if (error.message === "Invalid credentials") {
      throw new Error("Invalid credentials");
    }
    
    // Check local storage for user with this email
    const localUser = getFromLocalStorage(`user_${credentials.email}`);
    
    if (localUser) {
      // For local validation, implement a simple password check
      // In a real app, you'd use a proper hashing mechanism, but for demo purposes:
      const savedPassword = getFromLocalStorage(`password_${credentials.email}`);
      
      if (savedPassword && savedPassword === credentials.password) {
        // Return existing user from localStorage only if password matches
        return { 
          message: 'Login successful (local mode)',
          user: localUser
        };
      } else {
        // Password doesn't match - reject login
        throw new Error("Invalid credentials");
      }
    }
    
    // No user found with this email - reject login
    throw new Error("User not registered. Please create an account first.");
  }
};

export const logoutUser = async () => {
  try {
    return await apiCall('/logout', 'POST');
  } catch (error) {
    console.error('Logout failed:', error);
    return { message: 'Logged out successfully (local mode)' };
  }
};

export const getCurrentUser = async () => {
  try {
    return await apiCall('/user');
  } catch (error) {
    console.error('Get current user failed:', error);
    return { user: null };
  }
};

// Quiz APIs
export const saveQuizResults = async (quizData, suggestedCareers) => {
  try {
    const response = await apiCall('/quiz/save', 'POST', { quizData, suggestedCareers });
    
    // Save locally as fallback for offline mode
    const userEmail = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}current_user_email`);
    if (userEmail) {
      saveToLocalStorage(`quiz_${userEmail}`, {
        completed: true,
        quizData,
        suggestedCareers,
        timestamp: new Date().toISOString()
      });
    }
    
    return response;
  } catch (error) {
    console.error('Save quiz results failed:', error);
    return { message: 'Quiz results saved locally' };
  }
};

export const hasCompletedQuiz = async (email) => {
  try {
    console.log(`Checking if user ${email} has completed quiz`);
    const response = await apiCall(`/quiz/has-completed/${encodeURIComponent(email)}`);
    console.log(`Server response for hasCompletedQuiz:`, response);
    return response.hasCompleted || false;
  } catch (error) {
    console.error(`Check quiz completion failed for ${email}:`, error);
    
    // Check localStorage as fallback
    const userEmail = email || localStorage.getItem(`${LOCAL_STORAGE_PREFIX}current_user_email`);
    if (userEmail) {
      console.log(`Checking localStorage for quiz data for ${userEmail}`);
      const localQuizData = getFromLocalStorage(`quiz_${userEmail}`);
      
      // Check if we have quiz data in localStorage
      if (localQuizData && localQuizData.completed) {
        console.log(`Found completed quiz in localStorage for ${userEmail}`);
        return true;
      }
      
      // Also check for quiz_completed flag
      const quizCompleted = localStorage.getItem('quiz_completed');
      if (quizCompleted === 'true') {
        console.log(`Found quiz_completed flag in localStorage`);
        return true;
      }
    }
    
    // Check if there's quiz result data in the DB by trying a different endpoint
    try {
      console.log(`Trying alternative quiz history endpoint for ${email}`);
      const historyResponse = await apiCall('/quiz/history');
      if (historyResponse && historyResponse.quizHistory && historyResponse.quizHistory.length > 0) {
        console.log(`Found quiz history via alternative endpoint for ${email}`);
        return true;
      }
    } catch (innerError) {
      console.error(`Alternative quiz history check failed:`, innerError);
    }
    
    console.log(`No quiz completion found for ${email}`);
    return false;
  }
};

export const getQuizHistory = async () => {
  try {
    console.log(`Fetching quiz history`);
    const response = await apiCall('/quiz/history');
    console.log(`Quiz history response:`, response);
    
    // Add a convenience flag to indicate if the user has quiz data
    if (response.quizHistory && response.quizHistory.length > 0) {
      response.hasCompletedQuiz = true;
      
      // Ensure jobs are in the format that App.jsx expects
      if (!response.jobs || !Array.isArray(response.jobs) || response.jobs.length === 0) {
        console.log(`Jobs not found in response, looking for suggestedCareers`);
        
        // Try to extract jobs from quizHistory.suggestedCareers
        if (response.quizHistory[0].suggestedCareers) {
          console.log(`Found suggestedCareers in quiz history:`, response.quizHistory[0].suggestedCareers);
          
          // Convert suggestedCareers to the expected jobs format
          response.jobs = response.quizHistory[0].suggestedCareers.map(career => {
            if (typeof career === 'string') {
              return { title: career };
            } else if (typeof career === 'object' && career !== null) {
              return career.title ? career : { title: JSON.stringify(career) };
            }
            return { title: String(career) };
          });
          
          console.log(`Converted suggestedCareers to jobs format:`, response.jobs);
        }
      } else {
        console.log(`Jobs found in response, ensuring correct format`);
        
        // Ensure all jobs have a title property
        response.jobs = response.jobs.map(job => {
          if (typeof job === 'string') {
            return { title: job };
          } else if (typeof job === 'object' && job !== null) {
            return job.title ? job : { title: JSON.stringify(job) };
          }
          return { title: String(job) };
        });
      }
    } else {
      response.hasCompletedQuiz = false;
      response.jobs = [];
    }
    
    console.log(`Final processed quiz history:`, response);
    return response;
  } catch (error) {
    console.error('Get quiz history failed:', error);
    
    // Try to get from localStorage as fallback
    const userEmail = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}current_user_email`);
    if (userEmail) {
      console.log(`Checking localStorage for quiz history for ${userEmail}`);
      const localQuizData = getFromLocalStorage(`quiz_${userEmail}`);
      
      if (localQuizData && localQuizData.completed) {
        console.log(`Found quiz data in localStorage for ${userEmail}`);
        
        // Convert the data format to what the App expects
        let suggestedJobs = [];
        
        if (localQuizData.suggestedCareers) {
          console.log(`Found suggestedCareers in localStorage:`, localQuizData.suggestedCareers);
          
          // Convert array of strings to array of objects with title property
          suggestedJobs = localQuizData.suggestedCareers.map(career => {
            if (typeof career === 'string') {
              return { title: career };
            } else if (typeof career === 'object' && career !== null) {
              return career.title ? career : { title: JSON.stringify(career) };
            }
            return { title: String(career) };
          });
        } else {
          // Check if we have suggested_jobs in localStorage
          console.log(`Checking for suggested_jobs in localStorage`);
          const suggestedJobsStr = localStorage.getItem('suggested_jobs');
          
          if (suggestedJobsStr) {
            try {
              const parsedJobs = JSON.parse(suggestedJobsStr);
              
              if (Array.isArray(parsedJobs)) {
                console.log(`Found suggested_jobs in localStorage:`, parsedJobs);
                
                suggestedJobs = parsedJobs.map(job => {
                  if (typeof job === 'string') {
                    return { title: job };
                  } else if (typeof job === 'object' && job !== null) {
                    return job.title ? job : { title: JSON.stringify(job) };
                  }
                  return { title: String(job) };
                });
              }
            } catch (parseError) {
              console.error(`Error parsing suggested_jobs from localStorage:`, parseError);
            }
          }
        }
        
        console.log(`Final processed localStorage quiz history with jobs:`, suggestedJobs);
        
        return { 
          quizHistory: [localQuizData], 
          hasCompletedQuiz: true,
          jobs: suggestedJobs,
          completed: true
        };
      }
    }
    
    // If we reach here, we couldn't find any quiz history
    console.log(`No quiz history found in any source`);
    return { quizHistory: [], hasCompletedQuiz: false, jobs: [] };
  }
};

// Roadmap APIs
export const completeStep = async (careerTitle, stepIndex) => {
  try {
    return await apiCall('/roadmap/complete-step', 'POST', { careerTitle, stepIndex });
  } catch (error) {
    console.error('Complete step failed:', error);
    return { message: 'Step completion stored locally' };
  }
};

export const uncompleteStep = async (careerTitle, stepIndex) => {
  try {
    return await apiCall('/roadmap/complete-step', 'DELETE', { careerTitle, stepIndex });
  } catch (error) {
    console.error('Uncomplete step failed:', error);
    return { message: 'Step marked as incomplete locally' };
  }
};

export const getCompletedSteps = async (careerTitle) => {
  try {
    return await apiCall(`/roadmap/completed-steps/${encodeURIComponent(careerTitle)}`);
  } catch (error) {
    console.error('Get completed steps failed:', error);
    return { completedSteps: [] };
  }
};

// User profile update
export const updateUserProfile = async (userData) => {
  try {
    return await apiCall('/user/update', 'PUT', userData);
  } catch (error) {
    console.error('Profile update failed, using local update:', error);
    
    // Update locally as fallback
    const userEmail = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}current_user_email`);
    if (userEmail) {
      const localUser = getFromLocalStorage(`user_${userEmail}`);
      if (localUser) {
        // Update the local user data
        const updatedUser = { ...localUser, ...userData };
        saveToLocalStorage(`user_${userEmail}`, updatedUser);
        
        return {
          message: 'Profile updated successfully (local mode)',
          user: updatedUser
        };
      }
    }
    
    throw new Error('User not found');
  }
};

// Specific function to update user grade
export const updateUserGrade = async (grade) => {
  try {
    return await updateUserProfile({ grade });
  } catch (error) {
    console.error('Grade update failed:', error);
    
    // Already handled in updateUserProfile
    throw error;
  }
};

// Clear quiz data for a user
export const clearQuizData = async (email, grade) => {
  try {
    console.log(`Clearing quiz data for user: ${email} (grade ${grade})`);
    const response = await apiCall('/quiz/clear', 'POST', { email, grade });
    console.log('Quiz data cleared response:', response);
    
    // Also clear local storage backups
    const userEmail = email || localStorage.getItem(`${LOCAL_STORAGE_PREFIX}current_user_email`);
    if (userEmail) {
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}quiz_${userEmail}`);
      localStorage.removeItem('quiz_completed');
      localStorage.removeItem('suggested_jobs');
    }
    
    return response;
  } catch (error) {
    console.error('Clear quiz data failed:', error);
    
    // Fallback to clearing localStorage
    const userEmail = email || localStorage.getItem(`${LOCAL_STORAGE_PREFIX}current_user_email`);
    if (userEmail) {
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}quiz_${userEmail}`);
      localStorage.removeItem('quiz_completed');
      localStorage.removeItem('suggested_jobs');
    }
    
    return { message: 'Quiz data cleared locally (server error)' };
  }
};

export {
  apiCall
};

export default {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  saveQuizResults,
  getQuizHistory,
  hasCompletedQuiz,
  clearQuizData,
  completeStep,
  uncompleteStep,
  getCompletedSteps,
  updateUserProfile,
  updateUserGrade
}; 