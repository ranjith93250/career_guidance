import { useState } from "react";
import Quiz from "./components/Quiz";
import JobCard from "./components/JobCard";
import ChatBot from "./components/ChatBot";
import Roadmap from "./components/Roadmap";
import Login from "./components/Login";
import SearchFilters from "./components/SearchFilters";
import AnalyticsDashboard from "./components/AnalyticsDashboard";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "./index.css";

const App = () => {
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

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const cleanJobTitle = (title) => {
    return title
      .replace(/\*\*/g, "") // Remove all ** markers
      .replace(/^\d+\.\s*/, "") // Remove numbering if present
      .trim();
  };

  const handleQuizComplete = (jobs) => {
    console.log("Raw jobs from Quiz:", jobs);
    const validJobs = jobs
      .filter((job) => 
        job.title && 
        job.description && 
        !job.title.includes("Given the student") && 
        !job.title.includes("Here are") // Exclude introductory text
      )
      .map((job) => ({
        title: cleanJobTitle(job.title),
        description: job.description,
      }));
    console.log("Filtered valid jobs:", validJobs);
    setSuggestedJobs(validJobs);
    setQuizCompleted(true);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      // Include filters in the prompt if they exist
      let filterText = "";
      if (activeFilters) {
        if (activeFilters.categories.length > 0) {
          filterText += ` in ${activeFilters.categories.join(", ")} sector`;
        }
        if (activeFilters.location !== "Any") {
          filterText += ` with ${activeFilters.location} work options`;
        }
        if (activeFilters.requiredEducation !== "Any") {
          filterText += ` requiring ${activeFilters.requiredEducation} education`;
        }
        if (activeFilters.salaryRange[1] !== 25) {
          filterText += ` with salary range up to ${activeFilters.salaryRange[1]} lakhs per year`;
        }
      }

      const prompt = `Suggest 3 career paths related to "${searchQuery}"${filterText} for a ${grade}th grade student. Format each suggestion as: "Job Title: Description". For each job, include brief details about required education, potential salary range (in ₹ lakhs per year), and work location options. Provide plain text with job titles in bold.`;
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      console.log("Raw search response:", text);
      const jobs = text
        .split("\n")
        .filter((line) => line.includes(":"))
        .map((line) => {
          const firstColonIndex = line.indexOf(": ");
          if (firstColonIndex === -1) {
            return { title: line, description: "No description available" };
          }
          const title = line.substring(0, firstColonIndex).trim();
          const description = line.substring(firstColonIndex + 2).trim();
          return {
            title: cleanJobTitle(title),
            description,
          };
        })
        .filter((job) => job.title && job.description);
      console.log("Filtered search jobs:", jobs);
      setSearchResults(jobs);
    } catch (error) {
      console.log("Search error:", error.message);
      setSearchResults([
        { title: "Error", description: "Unable to fetch search results." },
      ]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleJobSelect = (title) => {
    const cleanedTitle = cleanJobTitle(title); // Ensure the title is cleaned before setting
    setSelectedJob(selectedJob === cleanedTitle ? null : cleanedTitle); // Toggle selection
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
                <div className="bg-teal-100 text-teal-800 text-sm font-medium px-3 py-1.5 rounded-full">
                  Grade {grade} Student
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-8">
        {!isLoggedIn ? (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden p-8">
              <Login setIsLoggedIn={setIsLoggedIn} setGrade={setGrade} />
            </div>
          </div>
        ) : !quizCompleted ? (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6">
            <Quiz onComplete={handleQuizComplete} grade={grade} />
          </div>
        ) : (
          <div>
            {showAnalytics && (
              <div className="bg-white rounded-xl shadow-lg overflow-hidden p-6 mb-8">
                <AnalyticsDashboard onSelectJob={handleJobSelect} />
              </div>
            )}
          
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

            {searchResults.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center mb-4">
                  <div className="w-1.5 h-6 bg-teal-600 rounded-r-full mr-2"></div>
                  <h3 className="text-xl font-semibold text-teal-800">
                    Search Results
                  </h3>
                </div>
                <div className="flex flex-wrap gap-6 justify-center">
                  {searchResults.map((job, index) => {
                    const cleanedTitle = cleanJobTitle(job.title);
                    return (
                      <div
                        key={`${cleanedTitle}-${index}`}
                        className="cursor-pointer"
                      >
                        <JobCard
                          title={cleanedTitle}
                          onSelect={() => handleJobSelect(job.title)}
                          isSelected={selectedJob === cleanedTitle}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {suggestedJobs.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center mb-4">
                  <div className="w-1.5 h-6 bg-teal-600 rounded-r-full mr-2"></div>
                  <h3 className="text-xl font-semibold text-teal-800">
                    Recommended Careers
                  </h3>
                </div>
                <div className="flex flex-wrap gap-6 justify-center">
                  {suggestedJobs.map((job, index) => {
                    const cleanedTitle = cleanJobTitle(job.title);
                    return (
                      <div
                        key={`${cleanedTitle}-${index}`}
                        className="cursor-pointer"
                      >
                        <JobCard
                          title={cleanedTitle}
                          onSelect={() => handleJobSelect(job.title)}
                          isSelected={selectedJob === cleanedTitle}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {selectedJob && (
              <Roadmap jobTitle={selectedJob} currentGrade={grade} />
            )}

            {/* Chat Bot Section */}
            <div className="mt-12">
              {quizCompleted && <ChatBot />}
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