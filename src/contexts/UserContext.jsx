import { createContext, useState, useContext, useEffect } from "react";

const UserContext = createContext();

export const useUserContext = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  // Load data from localStorage on mount
  const [userData, setUserData] = useState(() => {
    const savedData = localStorage.getItem("careerGuidanceUserData");
    return savedData ? JSON.parse(savedData) : {
      name: "",
      email: "",
      grade: 10,
      completedSteps: {}, // Format: { careerTitle: [0, 2] } - array of completed step indices
      favoriteJobs: [],
      previousSearches: [],
      viewedCareers: [],
    };
  });

  // Save to localStorage whenever userData changes
  useEffect(() => {
    localStorage.setItem("careerGuidanceUserData", JSON.stringify(userData));
  }, [userData]);

  // User profile functions
  const updateProfile = (profile) => {
    setUserData(prev => ({ ...prev, ...profile }));
  };

  // Roadmap step tracking functions
  const toggleStepCompletion = (jobTitle, stepIndex) => {
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
  };

  const getCompletedSteps = (jobTitle) => {
    return userData.completedSteps[jobTitle] || [];
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
        userData,
        updateProfile,
        toggleStepCompletion,
        getCompletedSteps,
        toggleFavoriteJob,
        isFavoriteJob,
        addViewedCareer,
        addSearchQuery
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserContext; 