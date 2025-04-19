import { useState, useEffect } from "react";
import Quiz from "./components/Quiz";
import JobCard from "./components/JobCard";
import ChatBot from "./components/ChatBot";
import Roadmap from "./components/Roadmap";
import Login from "./components/Login";
import SearchFilters from "./components/SearchFilters";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "./index.css";
import { hasCompletedQuiz, getQuizHistory, apiCall } from './services/api';
import { useUserContext } from './contexts/UserContext';
import Modal from 'react-modal';
import { LOCAL_STORAGE_PREFIX } from './constants';
import apiService from './services/api';

Modal.setAppElement('#root');

const App = () => {
  // Access user context
  const { updateGrade: updateUserGrade } = useUserContext();
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [grade, setGrade] = useState(10); // Store selected grade
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [suggestedJobs, setSuggestedJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilters, setActiveFilters] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showGradeSelector, setShowGradeSelector] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [hasQuizHistory, setHasQuizHistory] = useState(false);
  const [showRoadmap, setShowRoadmap] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [isRetakingQuiz, setIsRetakingQuiz] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [filters, setFilters] = useState({
    salary: false,
    workEnvironment: false,
    educationLevel: false,
    workLifeBalance: false
  });

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Load quiz state for the user when they login
  useEffect(() => {
    console.log("[App] Checking for existing user data");
    
    // Clear any stale auth data that might be stored from previous sessions
    const clearStaleData = () => {
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}current_user_email`);
      localStorage.removeItem('quiz_completed');
      localStorage.removeItem('suggested_jobs');
      setIsLoggedIn(false);
      setIsNewUser(true);
      setHasQuizHistory(false);
      setQuizCompleted(false);
      setSuggestedJobs([]);
    };
    
    const currentUserEmail = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}current_user_email`);
    
    console.log(`[App] Current user email: ${currentUserEmail}`);
    console.log(`[App] isRetakingQuiz flag: ${isRetakingQuiz}`);
    
    // If user is logged in but we're retaking the quiz, show the quiz
    if (isRetakingQuiz) {
      console.log("[App] User is retaking quiz - resetting quiz UI state");
      setHasQuizHistory(false);
      setQuizCompleted(false);
      setSuggestedJobs([]);
      return;
    }

    if (currentUserEmail) {
      // Check if user profile exists in localStorage
      const userProfileJson = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}user_${currentUserEmail}`);
      if (!userProfileJson) {
        console.log("[App] User email found but no profile data - clearing stale data");
        clearStaleData();
        return;
      }
      
      try {
        // User is logged in
        setIsLoggedIn(true);
        setIsNewUser(false);
        
        // Get user profile from localStorage
        const profile = JSON.parse(userProfileJson);
        setUserProfile(profile);
        setGrade(profile.grade || 10);
        console.log(`[App] Found user profile for ${currentUserEmail}`, profile);
        
        // Check quiz history using the API service
        apiService.getQuizHistory().then(data => {
          console.log(`[App] Quiz history response:`, data);
          if (data && data.hasCompletedQuiz) {
            setHasQuizHistory(true);
            setQuizCompleted(true);
            
            // If we have suggested jobs, set them
            if (data.jobs && data.jobs.length > 0) {
              setSuggestedJobs(data.jobs);
            } else if (data.suggestedJobs && data.suggestedJobs.length > 0) {
              setSuggestedJobs(data.suggestedJobs);
            }
          } else {
            setHasQuizHistory(false);
            setQuizCompleted(false);
          }
        }).catch(error => {
          console.error("Error checking quiz history:", error);
          setHasQuizHistory(false);
          setQuizCompleted(false);
        });
      } catch (error) {
        console.error("Error parsing user profile:", error);
        clearStaleData();
      }
    } else {
      // No user is logged in - clear any stale data and show login page
      clearStaleData();
    }
  }, [isLoggedIn, isRetakingQuiz]);

  const cleanJobTitle = (title) => {
    // Handle case where title might be an object with a 'title' property
    const titleStr = typeof title === 'object' && title !== null && title.title 
      ? title.title 
      : String(title);
      
    // First get the title part before any colon 
    const mainTitle = titleStr.split(':')[0];
    
    return mainTitle
      .replace(/\*\*/g, "") // Remove all ** markers
      .replace(/^\d+\.\s*/, "") // Remove numbering if present
      .trim();
  };

  const handleQuizComplete = async (quizResults, aiSuggestedJobs) => {
    console.log("Quiz completed! Raw results:", quizResults);
    console.log("Suggested jobs from AI:", aiSuggestedJobs);
    
    // Process job titles to be ready for display
    const cleanedJobs = aiSuggestedJobs
      .filter(job => {
        // Filter out any null/undefined jobs or informational cards
        if (!job) return false;
        
        // Get the job title string
        const jobTitle = typeof job === 'string' ? job : (job.title || '');
        const title = jobTitle.toLowerCase();
        
        // Filter out any informational cards
        return title.trim().length > 0 && 
               !title.includes('here are three') && 
               !title.includes('potential career') && 
               !title.includes('preferences') &&
               !title.includes('grade student') &&
               !title.includes('given preferences');
      })
      .map(job => {
        // Handle different types of input
        let jobTitle = '';
        
        if (typeof job === 'string') {
          jobTitle = job;
        } else if (typeof job === 'object' && job !== null) {
          jobTitle = job.title || JSON.stringify(job);
        } else {
          jobTitle = String(job);
        }
        
        // Clean up job title, remove any "1." or "2." prefixes
        let cleanedJob = jobTitle.replace(/^\d+\.\s*/, '');
        // Remove quotes if present
        cleanedJob = cleanedJob.replace(/^"(.*)"$/, '$1');
        // Remove any other formatting that might cause issues
        cleanedJob = cleanedJob.replace(/\*\*/g, '');
        
        return {
          title: cleanedJob.trim()
        };
      })
      .filter((job, index, self) => 
        // Remove duplicates
        self.findIndex(j => j.title.toLowerCase() === job.title.toLowerCase()) === index
      );
    
    console.log("Processed job suggestions:", cleanedJobs);
    
    // Limit to exactly 3 job cards - ensure we never have more or fewer than 3
    let finalJobList = cleanedJobs;
    if (cleanedJobs.length === 0) {
      console.warn("No valid job suggestions were found. Using fallback jobs.");
      // Provide fallback jobs if none were provided
      finalJobList = [
        { title: "Software Developer" },
        { title: "Data Analyst" },
        { title: "Marketing Specialist" }
      ];
    } else if (cleanedJobs.length > 3) {
      // Only take the first 3
      finalJobList = cleanedJobs.slice(0, 3);
    } else if (cleanedJobs.length < 3) {
      // Add generic jobs to make it 3
      const genericJobs = [
        { title: "Software Developer" },
        { title: "Data Analyst" },
        { title: "Marketing Specialist" }
      ];
      
      // Add enough generic jobs to make it 3 total
      const needed = 3 - cleanedJobs.length;
      finalJobList = [...cleanedJobs, ...genericJobs.slice(0, needed)];
    }
    
    console.log("Final job list (exactly 3 jobs):", finalJobList);
    
    // Update local state
    setQuizCompleted(true);
    setSuggestedJobs(finalJobList);
    setSelectedJob(null);
    setShowRoadmap(false);
    
    // Set quiz history flag
    setHasQuizHistory(true);
    
    // Save quiz results to server and localStorage using API service
    try {
      await apiService.saveQuizResults(quizResults, finalJobList);
      console.log("Quiz results saved successfully");
    } catch (error) {
      console.error("Error saving quiz results:", error);
      
      // Save to localStorage as fallback
      localStorage.setItem('quiz_completed', 'true');
      localStorage.setItem('suggested_jobs', JSON.stringify(finalJobList));
    }
    
    console.log("Quiz completion process finished. Suggested jobs:", finalJobList);
  };

  const handleRetakeQuiz = () => {
    console.log("Opening grade selector modal for quiz retake");
    setShowGradeModal(true);
  };

  const confirmRetakeQuiz = async (selectedGrade) => {
    console.log(`Confirming quiz retake with grade: ${selectedGrade}`);
    
    // Set retaking quiz flag to trigger UI update
    setIsRetakingQuiz(true);
    
    // Update UI state immediately
    setQuizCompleted(false);
    setSuggestedJobs([]);
    setGrade(selectedGrade);
    setShowGradeSelector(false);
    setHasQuizHistory(false);
    setShowGradeModal(false);
    
    // Update user profile with new grade
    if (userProfile) {
      // Create updated profile
      const updatedProfile = {
        ...userProfile,
        grade: selectedGrade
      };
      
      // Update local state first
      setUserProfile(updatedProfile);
      
      // Update grade using both API service and UserContext for maximum reliability
      try {
        // Update the user's grade via both methods for redundancy
        const apiPromise = apiService.updateUserGrade(selectedGrade);
        const contextPromise = updateUserGrade(selectedGrade);
        
        // Wait for both to complete
        await Promise.all([apiPromise, contextPromise]);
        console.log("Updated user grade on server and in context");
        
        // Also store updated grade in localStorage for fallback
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}user_${userProfile.email}`, JSON.stringify(updatedProfile));
      } catch (error) {
        console.error("Error updating grade:", error);
        // Fallback to localStorage
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}user_${userProfile.email}`, JSON.stringify(updatedProfile));
      }
    }
    
    // Clear quiz state using API service
    try {
      // If user is logged in, clear quiz data
      if (isLoggedIn && userProfile) {
        await apiService.clearQuizData(userProfile.email, selectedGrade);
        console.log("Quiz data cleared from server and local storage");
      } else {
        // Just clear local storage if not logged in
        localStorage.removeItem('quiz_completed');
        localStorage.removeItem('suggested_jobs');
      }
    } catch (error) {
      console.error("Error clearing quiz state:", error);
      // Fallback to clearing localStorage directly
      localStorage.removeItem('quiz_completed');
      localStorage.removeItem('suggested_jobs');
    }
    
    console.log("Quiz retake setup complete - quiz should now be displayed with grade:", selectedGrade);
  };

  const cancelRetakeQuiz = () => {
    setShowGradeModal(false);
  };

  const handleUserLogin = (user, isNew = false) => {
    console.log(`🔑 User logged in: ${user.email}, isNew: ${isNew}`);
    
    // Ensure localStorage is cleared before login to prevent state conflicts
    localStorage.removeItem('quiz_completed');
    localStorage.removeItem('suggested_jobs');
    
    // Set basic user state
    setIsLoggedIn(true);
    setUserProfile(user);
    setGrade(user.grade || 10);
    setIsNewUser(isNew);
    
    // Store current user email in localStorage for API fallbacks
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}current_user_email`, user.email);
    
    // Also ensure user profile is stored in localStorage
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}user_${user.email}`, JSON.stringify(user));
    
    // If it's a new user, immediately set quizCompleted to false
    if (isNew) {
      console.log('🔑 New user, setting quiz as not completed');
      setQuizCompleted(false);
      setSuggestedJobs([]);
      setHasQuizHistory(false);
    } else {
      // For returning users, check their quiz history immediately
      console.log('🔑 Returning user, checking quiz history');
      
      // Check if user has completed the quiz before
      apiService.getQuizHistory()
        .then(data => {
          console.log('🔑 Quiz history check results:', data);
          
          if (data && data.hasCompletedQuiz) {
            setHasQuizHistory(true);
            setQuizCompleted(true);
            
            // Set suggested jobs if they exist
            if (data.jobs && data.jobs.length > 0) {
              setSuggestedJobs(data.jobs);
            } else if (data.suggestedJobs && data.suggestedJobs.length > 0) {
              setSuggestedJobs(data.suggestedJobs);
            }
          } else {
            // No quiz history found
            setHasQuizHistory(false);
            setQuizCompleted(false);
            setSuggestedJobs([]);
          }
        })
        .catch(error => {
          console.error('🔑 Error checking quiz history:', error);
          setHasQuizHistory(false);
          setQuizCompleted(false);
        });
    }
  };

  const handleLogout = () => {
    // Clear all application state
    setIsLoggedIn(false);
    setUserProfile(null);
    setQuizCompleted(false);
    setSuggestedJobs([]);
    setSelectedJob(null);
    setShowRoadmap(false);
    setSearchQuery("");
    setSearchResults([]);
    setHasQuizHistory(false);
    
    // Clear all localStorage data
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}current_user_email`);
    localStorage.removeItem('quiz_completed');
    localStorage.removeItem('suggested_jobs');
    
    // Also try to log out through the API
    apiService.logoutUser().catch(error => {
      console.error("Error during logout:", error);
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]); // Clear previous results
    
    try {
      // Construct a prompt that asks for career suggestions based on the search
      let prompt = `Based on the search query "${searchQuery}", suggest 3-5 relevant career paths that would be suitable. `;
      
      // Add filter conditions to the prompt
      if (Object.values(filters).some(val => val)) {
        prompt += "Consider these additional factors: ";
        
        if (filters.salary) {
          prompt += "good salary potential, ";
        }
        
        if (filters.workEnvironment) {
          prompt += "positive work environment, ";
        }
        
        if (filters.educationLevel) {
          prompt += "varied education requirements (not all requiring advanced degrees), ";
        }
        
        if (filters.workLifeBalance) {
          prompt += "good work-life balance, ";
        }
        
        // Remove trailing comma and space
        prompt = prompt.replace(/,\s*$/, "");
      }
      
      prompt += " Provide the list in this exact format - just the names of the careers, one per line: \n1. Career Name 1\n2. Career Name 2\n3. Career Name 3";
      
      console.log("Search prompt:", prompt);
      
      // Get career suggestions from Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log("Search response:", text);
      
      // Process the suggestions
      const lines = text.split('\n');
      const suggestions = lines
        .filter(line => line.trim() && /^\d+\./.test(line)) // Only lines that start with a number and period
        .map(line => ({
          title: line.replace(/^\d+\.\s*/, '').trim() // Remove the number prefix
        }));
      
      if (suggestions.length === 0) {
        // If no valid results found, provide fallback careers
        console.log("No valid search results found, using fallbacks");
        setSearchResults([
          { title: "Data Scientist" },
          { title: "Software Engineer" },
          { title: "Digital Marketing Specialist" }
        ]);
      } else {
        setSearchResults(suggestions);
      }
    } catch (error) {
      console.error("Error searching for careers:", error);
      // Instead of showing error message as a career, provide fallback careers
      setSearchResults([
        { title: "Data Scientist" },
        { title: "Software Engineer" },
        { title: "Digital Marketing Specialist" }
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleJobSelect = (title) => {
    // Handle case where title might be an object
    const jobTitle = typeof title === 'object' && title !== null && title.title 
      ? title.title 
      : String(title);
      
    // Ensure the title is properly cleaned before setting
    const cleanedTitle = cleanJobTitle(jobTitle);
    
    // Limit to 50 characters max to avoid URL length issues
    const truncatedTitle = cleanedTitle.length > 50 
      ? cleanedTitle.substring(0, 50) + "..." 
      : cleanedTitle;
      
    console.log("Selected job:", jobTitle);
    console.log("Cleaned job title:", truncatedTitle);
    setSelectedJob(truncatedTitle);
    setShowRoadmap(true);
  };

  const handleApplyFilters = (filters) => {
    setActiveFilters(filters);
    if (searchQuery.trim()) {
      handleSearch(); // Re-search with new filters
    }
  };

  const toggleAnalytics = () => {
    setShowAnalytics(!showAnalytics);
  };

  const handleGradeSubmit = () => {
    setQuizCompleted(false);
    setSuggestedJobs([]);
    setSelectedJob(null);
    setShowRoadmap(false);
    setShowGradeModal(false);
    
    // Update user profile with the new grade
    if (userProfile) {
      const updatedProfile = {
        ...userProfile,
        grade
      };
      setUserProfile(updatedProfile);
      
      // Update grade locally and on server
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}user_${userProfile.email}`, JSON.stringify(updatedProfile));
      updateUserGrade(grade);
    }
  };

  const handleBackToJobs = () => {
    setShowRoadmap(false);
    setSelectedJob(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-50">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto py-4 px-6 sm:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-teal-800 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-3 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              Career Guidance
            </h1>
            {isLoggedIn && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleAnalytics}
                  className="px-3 py-1.5 bg-indigo-100 text-indigo-800 rounded-full hover:bg-indigo-200 transition-colors text-sm font-medium flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  {showAnalytics ? "Hide Analytics" : "Career Analytics"}
                </button>
                
                {quizCompleted && (
                  <button
                    onClick={handleRetakeQuiz}
                    className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200 transition-colors text-sm font-medium flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Retake Quiz
                  </button>
                )}
                
                <div className="bg-teal-100 text-teal-800 text-sm font-medium px-3 py-1.5 rounded-full">
                  Grade {grade} Student
                </div>
                
                <button 
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-red-100 text-red-800 rounded-full hover:bg-red-200 transition-colors text-sm font-medium flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-8">
        {/* Grade selector modal for retaking quiz */}
        {showGradeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-teal-800 mb-4">Select Your Grade</h3>
              <p className="text-gray-600 mb-6">Please select your current grade to retake the quiz with appropriate questions.</p>
              
              <div className="space-y-3 mb-6">
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => confirmRetakeQuiz(10)} 
                    className="w-full py-3 border-2 border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
                  >
                    Grade 10
                  </button>
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => confirmRetakeQuiz(11)} 
                    className="w-full py-3 border-2 border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
                  >
                    Grade 11
                  </button>
                </div>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => confirmRetakeQuiz(12)} 
                    className="w-full py-3 border-2 border-teal-200 rounded-lg hover:bg-teal-50 transition-colors"
                  >
                    Grade 12
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button 
                  onClick={cancelRetakeQuiz}
                  className="px-5 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Login / Registration */}
        {!isLoggedIn ? (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden p-8">
              <Login setIsLoggedIn={handleUserLogin} setGrade={setGrade} />
            </div>
          </div>
        ) 
        /* Quiz Component - Show when:
           1. User is new OR
           2. User is retaking quiz OR
           3. User has no quiz history AND quiz is not marked as completed
        */
        : (isNewUser || isRetakingQuiz || (!hasQuizHistory && !quizCompleted)) ? (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6">
            <Quiz 
              onComplete={handleQuizComplete} 
              grade={grade} 
              onQuizFinished={() => setIsRetakingQuiz(false)}
            />
          </div>
        ) 
        /* Career Results Section - Show when quiz is completed OR user has quiz history */
        : (
          <div>
            {/* Analytics Dashboard Section */}
            {showAnalytics && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6 mb-8">
                <AnalyticsDashboard onSelectJob={handleJobSelect} />
              </div>
            )}
          
            {/* Career Search Section */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6 mb-8">
              <h2 className="text-2xl font-bold text-teal-800 mb-6">Explore Careers</h2>
              
              {/* Search Filters */}
              <SearchFilters onApplyFilters={handleApplyFilters} />
              
              <div className="max-w-3xl mx-auto">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search for a career (e.g., Doctor, Artist, Engineer)..."
                    className="w-full p-4 border-2 border-teal-100 rounded-full focus:outline-none focus:border-teal-400 transition-colors shadow-sm"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={isSearching}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-2 bg-teal-600 text-white rounded-full hover:bg-teal-700 transition-colors disabled:bg-teal-400"
                  >
                    {isSearching ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Searching...
                      </span>
                    ) : "Search"}
                  </button>
                </div>
              </div>
            </div>

            {/* Career Results Sections Container */}
            <div className="career-results-container">
              {/* Recommended Careers Section */}
              {suggestedJobs.length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center mb-4">
                    <div className="w-1.5 h-6 bg-teal-600 rounded-r-full mr-2"></div>
                    <h3 className="text-xl font-semibold text-teal-800">
                      Recommended Careers
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-6 justify-center">
                    {suggestedJobs.slice(0, 3).map((job, index) => {
                      // Handle both string and object formats
                      const jobTitle = typeof job === 'string' ? job : job.title || '';
                      const cleanedTitle = cleanJobTitle(jobTitle);
                      return cleanedTitle ? (
                        <div
                          key={`${cleanedTitle}-${index}`}
                          className="cursor-pointer job-card-container"
                        >
                          <JobCard
                            title={cleanedTitle}
                            onSelect={() => handleJobSelect(job)} // Pass the entire job object
                            isSelected={selectedJob === cleanedTitle}
                          />
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              
              {/* Search Results Section */}
              {searchResults.length > 0 && (
                <div className="mb-10">
                  <div className="flex items-center mb-4">
                    <div className="w-1.5 h-6 bg-teal-600 rounded-r-full mr-2"></div>
                    <h3 className="text-xl font-semibold text-teal-800">
                      Search Results
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-6 justify-center">
                    {searchResults.slice(0, 3).map((job, index) => {
                      // Handle both string and object formats
                      const jobTitle = typeof job === 'string' ? job : job.title || '';
                      const cleanedTitle = cleanJobTitle(jobTitle);
                      return cleanedTitle ? (
                        <div
                          key={`${cleanedTitle}-${index}`}
                          className="cursor-pointer"
                        >
                          <JobCard
                            title={cleanedTitle}
                            onSelect={() => handleJobSelect(job)} // Pass the entire job object
                            isSelected={selectedJob === cleanedTitle}
                          />
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Roadmap Section */}
            {showRoadmap && selectedJob && (
              <div className="p-6">
                <button 
                  className="mb-4 text-indigo-600 hover:text-indigo-800 flex items-center"
                  onClick={handleBackToJobs}
                >
                  <span className="mr-1">←</span> Back to career options
                </button>
                <Roadmap jobTitle={selectedJob} currentGrade={grade} />
              </div>
            )}

            {/* Chat Bot Section */}
            <div className="mt-12">
              <ChatBot />
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white shadow-inner mt-12">
        <div className="max-w-7xl mx-auto py-4 px-6 text-center text-gray-600 text-sm">
          Career Guidance Tool for Students - Helping you plan your future path
        </div>
      </footer>
    </div>
  );
};

export default App;