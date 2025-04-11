import { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

const Quiz = ({ onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const questions = [
    "What is your favorite subject or activity?",
    "What kind of work environment do you prefer (e.g., indoors, outdoors, collaborative)?",
    "What skill are you most proud of?",
    "What kind of impact do you want to have (e.g., helping people, advancing knowledge)?",
  ];

  const handleAnswer = (answer) => {
    setAnswers({ ...answers, [currentQuestion + 1]: answer });
  };

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setIsLoading(true);
      try {
        const prompt = `Based on the following answers from a 10-12th grade student, suggest 3 career paths with job titles and short descriptions:\n
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
            // Split on the first occurrence of ": " after the job title
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

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-teal-800 mb-6">Career Quiz</h2>
      <div className="mb-6">
        <p className="text-lg text-gray-700 mb-4">{questions[currentQuestion]}</p>
        <input
          type="text"
          value={answers[currentQuestion + 1] || ""}
          onChange={(e) => handleAnswer(e.target.value)}
          placeholder="Type your answer..."
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>
      <button
        onClick={handleNext}
        disabled={isLoading}
        className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-400"
      >
        {isLoading ? "Loading..." : currentQuestion === questions.length - 1 ? "Submit" : "Next"}
      </button>
    </div>
  );
};

export default Quiz;