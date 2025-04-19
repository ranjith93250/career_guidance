import { createContext, useState, useContext, useEffect } from "react";
import * as api from "../services/api";

const UserContext = createContext();

export const useUserContext = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [userData, setUserData] = useState({
    user: null,
    isAuthenticated: false,
    completedSteps: {}, // Format: { careerTitle: [0, 2] } - array of completed step indices
    favoriteJobs: [],
    previousSearches: [],
    viewedCareers: [],
    quizHistory: []
  });
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await api.getCurrentUser();
        
        if (response.user) {
          setUserData(prev => ({
            ...prev,
            user: response.user,
            isAuthenticated: true
          }));
          
          // Load completed steps, quiz history, etc.
          loadUserData();
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthStatus();
  }, []);
  
  // Load user data (completed steps, quiz history, etc.)
  const loadUserData = async () => {
    try {
      // Get quiz history
      const quizHistoryResponse = await api.getQuizHistory();
      if (quizHistoryResponse.quizHistory) {
        setUserData(prev => ({
          ...prev,
          quizHistory: quizHistoryResponse.quizHistory
        }));
      }
      
      // We could also load other user data here in the future
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  // User authentication functions
  const login = async (email, password) => {
    try {
      console.log(`Attempting login for: ${email}`);
      
      if (!email || !password) {
        return { success: false, error: "Email and password are required" };
      }
      
      const response = await api.loginUser({ email, password });
      
      if (!response || !response.user) {
        console.error("Invalid response from login API:", response);
        return { success: false, error: "Login failed. Invalid response from server." };
      }
      
      console.log(`Login successful for: ${email}`);
      
      setUserData(prev => ({
        ...prev,
        user: response.user,
        isAuthenticated: true
      }));
      
      loadUserData();
      return { success: true, user: response.user };
    } catch (error) {
      console.error(`Login error for ${email}:`, error.message);
      
      // Make sure the error is propagated up correctly
      throw error;
    }
  };
  
  const register = async (name, email, password, grade) => {
    try {
      console.log(`Attempting registration for: ${email}`);
      
      if (!name || !email || !password || !grade) {
        return { success: false, error: "All fields are required" };
      }
      
      const response = await api.registerUser({ name, email, password, grade });
      
      if (!response || !response.user) {
        console.error("Invalid response from registration API:", response);
        return { success: false, error: "Registration failed. Invalid response from server." };
      }
      
      console.log(`Registration successful for: ${email}`);
      
      setUserData(prev => ({
        ...prev,
        user: response.user,
        isAuthenticated: true
      }));
      
      return { success: true };
    } catch (error) {
      console.error(`Registration error for ${email}:`, error.message);
      return { success: false, error: error.message };
    }
  };
  
  const logout = async () => {
    try {
      await api.logoutUser();
      
      setUserData({
        user: null,
        isAuthenticated: false,
        completedSteps: {},
        favoriteJobs: [],
        previousSearches: [],
        viewedCareers: [],
        quizHistory: []
      });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  // User profile functions
  const updateProfile = async (profile) => {
    try {
      // Update on server if possible
      if (userData.isAuthenticated) {
        await api.updateUserProfile(profile);
      }
      
      // Update local state
      setUserData(prev => ({ 
        ...prev, 
        user: { ...prev.user, ...profile } 
      }));
      
      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      return false;
    }
  };
  
  // Function specifically for updating grade
  const updateGrade = async (grade) => {
    return await updateProfile({ grade });
  };

  // Quiz functions
  const saveQuizResults = async (quizData, suggestedCareers) => {
    try {
      if (!userData.isAuthenticated) {
        console.warn("Cannot save quiz results: User not authenticated");
        return false;
      }
      
      await api.saveQuizResults(quizData, suggestedCareers);
      
      // Update local state
      setUserData(prev => ({
        ...prev,
        quizHistory: [
          {
            id: Date.now(), // Temporary ID until we reload from server
            quizData,
            suggestedCareers,
            createdAt: new Date().toISOString()
          },
          ...prev.quizHistory
        ]
      }));
      
      return true;
    } catch (error) {
      console.error("Error saving quiz results:", error);
      return false;
    }
  };

  // Roadmap step tracking functions
  const toggleStepCompletion = async (jobTitle, stepIndex) => {
    if (!userData.isAuthenticated) {
      console.warn("Cannot update steps: User not authenticated");
      
      // Still update local state for demo purposes
      setUserData(prev => {
        const currentSteps = prev.completedSteps[jobTitle] || [];
        const updatedSteps = currentSteps.includes(stepIndex)
          ? currentSteps.filter(idx => idx !== stepIndex)
          : [...currentSteps, stepIndex];
        
        return {
          ...prev,
          completedSteps: {
            ...prev.completedSteps,
            [jobTitle]: updatedSteps
          }
        };
      });
      
      return;
    }
    
    try {
      const currentSteps = userData.completedSteps[jobTitle] || [];
      const isCompleted = currentSteps.includes(stepIndex);
      
      if (isCompleted) {
        await api.uncompleteStep(jobTitle, stepIndex);
      } else {
        await api.completeStep(jobTitle, stepIndex);
      }
      
      // Update local state
      setUserData(prev => {
        const currentSteps = prev.completedSteps[jobTitle] || [];
        const updatedSteps = isCompleted
          ? currentSteps.filter(idx => idx !== stepIndex)
          : [...currentSteps, stepIndex];
        
        return {
          ...prev,
          completedSteps: {
            ...prev.completedSteps,
            [jobTitle]: updatedSteps
          }
        };
      });
    } catch (error) {
      console.error("Error toggling step completion:", error);
    }
  };

  const getCompletedSteps = async (jobTitle) => {
    // If we have it in state already, return that
    if (userData.completedSteps[jobTitle]) {
      return userData.completedSteps[jobTitle];
    }
    
    // If user is not authenticated, return empty array
    if (!userData.isAuthenticated) {
      return [];
    }
    
    // Otherwise, fetch from API
    try {
      const response = await api.getCompletedSteps(jobTitle);
      
      // Update local state
      setUserData(prev => ({
        ...prev,
        completedSteps: {
          ...prev.completedSteps,
          [jobTitle]: response.completedSteps
        }
      }));
      
      return response.completedSteps;
    } catch (error) {
      console.error("Error getting completed steps:", error);
      return [];
    }
  };

  // Favorite jobs functions
  const toggleFavoriteJob = (jobTitle) => {
    setUserData(prev => {
      if (prev.favoriteJobs.includes(jobTitle)) {
        return {
          ...prev,
          favoriteJobs: prev.favoriteJobs.filter(job => job !== jobTitle)
        };
      } else {
        return {
          ...prev,
          favoriteJobs: [...prev.favoriteJobs, jobTitle]
        };
      }
    });
  };

  const isFavoriteJob = (jobTitle) => {
    return userData.favoriteJobs.includes(jobTitle);
  };

  // Career viewing history
  const addViewedCareer = (jobTitle) => {
    if (!userData.viewedCareers.includes(jobTitle)) {
      setUserData(prev => ({
        ...prev,
        viewedCareers: [jobTitle, ...prev.viewedCareers].slice(0, 10)
      }));
    }
  };

  // Search history
  const addSearchQuery = (query) => {
    if (query.trim() && !userData.previousSearches.includes(query)) {
      setUserData(prev => ({
        ...prev,
        previousSearches: [query, ...prev.previousSearches].slice(0, 10)
      }));
    }
  };

  return (
    <UserContext.Provider
      value={{
        user: userData.user,
        isAuthenticated: userData.isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        updateProfile,
        updateGrade,
        toggleStepCompletion,
        getCompletedSteps,
        toggleFavoriteJob,
        isFavoriteJob,
        saveQuizResults,
        addViewedCareer,
        addSearchQuery,
        favoriteJobs: userData.favoriteJobs,
        previousSearches: userData.previousSearches,
        viewedCareers: userData.viewedCareers,
        quizHistory: userData.quizHistory
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserContext; 