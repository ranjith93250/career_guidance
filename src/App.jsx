import { useState } from "react";
import Quiz from "./components/Quiz";
import JobCard from "./components/JobCard";
import ChatBot from "./components/ChatBot";
import Roadmap from "./components/Roadmap";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "./index.css";

const App = () => {
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [suggestedJobs, setSuggestedJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const currentGrade = 10;

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Utility function to clean job titles by removing stars
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
      const prompt = `Suggest 3 career paths related to "${searchQuery}" for a 10-12th grade student. Format each suggestion as: "Job Title: Description".and dont give me unrelated styles just plain text is fine with bold and dont mention numbers.dont mention ** when you give`;
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

  return (
    <div className="app">
      <h1>Career Guidance for Grades 10-12</h1>
      {!quizCompleted ? (
        <Quiz onComplete={handleQuizComplete} />
      ) : (
        <div>
          <h2>Suggested Careers</h2>
          <div className="mb-6">
            <div className="flex max-w-lg mx-auto space-x-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search for a career (e.g., Doctor, Artist)..."
                className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-400"
              >
                {isSearching ? "Searching..." : "Search"}
              </button>
            </div>
          </div>
          {searchResults.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-teal-800 mb-4">
                Search Results
              </h3>
              <div className="flex flex-wrap gap-4 justify-center">
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
          <div className="flex flex-wrap gap-4 justify-center">
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
          {selectedJob && (
            <div className="mt-8">
              <Roadmap jobTitle={selectedJob} currentGrade={currentGrade} />
            </div>
          )}
        </div>
      )}
      {quizCompleted && <ChatBot />} {/* Render ChatBot only after quiz completion */}
    </div>
  );
};

export default App;