import { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

const Quiz = ({ onComplete, grade }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const questions = {
    10: [
      "What is your favorite subject or activity in grade 10?",
      "What kind of work environment do you prefer (e.g., indoors, outdoors, collaborative)?",
      "What skill are you most proud of this year?",
      "What kind of impact do you want to have as a 10th grader?",
    ],
    11: [
      "What subject are you excelling in during grade 11?",
      "Do you prefer working alone or in a team?",
      "What skill have you developed this year?",
      "What impact do you aim for as an 11th grader?",
    ],
    12: [
      "What's your strongest subject in grade 12?",
      "Do you prefer a structured or creative work environment?",
      "What skill have you mastered this year?",
      "What legacy do you want to leave as a 12th grader?",
    ],
  };

  const currentQuestions = questions[grade] || questions[10]; // Default to grade 10 if grade is invalid

  const handleAnswer = (answer) => {
    setAnswers({ ...answers, [currentQuestion + 1]: answer });
  };

  const handleNext = async () => {
    if (currentQuestion < currentQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setIsLoading(true);
      try {
        const prompt = `Based on the following answers from a ${grade}th grade student, suggest 3 career paths with job titles and short descriptions:\n
          1. Favorite subject/activity: ${answers[1] || "N/A"}\n
          2. Preferred work environment: ${answers[2] || "N/A"}\n
          3. Proudest skill: ${answers[3] || "N/A"}\n
          4. Desired impact: ${answers[4] || "N/A"}\n
          Format each suggestion as: "Job Title: Description"`;
        console.log("Quiz prompt:", prompt);
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        console.log("Quiz raw response:", text);

        const jobs = text
          .split("\n")
          .filter((line) => line.trim() !== "" && line.includes(":"))
          .map((line) => {
            const firstColonIndex = line.indexOf(": ");
            if (firstColonIndex === -1) {
              return { title: line, description: "No description available" };
            }
            const title = line.substring(0, firstColonIndex).trim();
            const description = line.substring(firstColonIndex + 2).trim();
            return { title, description };
          });
        console.log("Parsed jobs:", jobs);
        onComplete(jobs);
      } catch (error) {
        console.log("Quiz error:", error.message);
        onComplete([
          { title: "Default Job 1", description: "An error occurred. Try again later." },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Handle key press for the input field
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading && answers[currentQuestion + 1]?.trim()) {
      e.preventDefault();
      handleNext();
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-teal-800 mb-6">Career Quiz for Grade {grade}</h2>
      
      {/* Progress indicator */}
      <div className="mb-6 flex justify-between">
        {currentQuestions.map((_, index) => (
          <div 
            key={index}
            className={`h-2 rounded-full flex-1 mx-0.5 ${
              index === currentQuestion 
                ? 'bg-teal-600' 
                : index < currentQuestion 
                  ? 'bg-teal-300' 
                  : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      
      <div className="mb-6">
        <p className="text-lg text-gray-700 mb-4">{currentQuestions[currentQuestion]}</p>
        <input
          type="text"
          value={answers[currentQuestion + 1] || ""}
          onChange={(e) => handleAnswer(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type your answer..."
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          autoFocus
        />
      </div>
      
      <div className="flex justify-between items-center">
        {currentQuestion > 0 && (
          <button
            onClick={() => setCurrentQuestion(currentQuestion - 1)}
            className="py-2 px-4 text-teal-600 hover:text-teal-800 transition-colors"
          >
            ← Previous
          </button>
        )}
        
        <button
          onClick={handleNext}
          disabled={isLoading || !answers[currentQuestion + 1]?.trim()}
          className={`py-3 px-6 bg-teal-600 text-white rounded-lg transition-colors ${
            answers[currentQuestion + 1]?.trim() 
              ? 'hover:bg-teal-700' 
              : 'opacity-50 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : currentQuestion === currentQuestions.length - 1 ? (
            <span className="flex items-center">
              Submit
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
            </span>
          ) : (
            <span className="flex items-center">
              Next
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          )}
        </button>
        
        {currentQuestion > 0 && !currentQuestion < currentQuestions.length - 1 && (
          <div className="w-20">{/* Placeholder for alignment */}</div>
        )}
      </div>
      
      <div className="text-center text-gray-500 text-xs mt-6">
        Press Enter to continue to the next question
      </div>
    </div>
  );
};

export default Quiz;