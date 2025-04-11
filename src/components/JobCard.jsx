import { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

const JobCard = ({ title, onSelect, isSelected }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const handleLearnMore = async () => {
    setIsLoading(true);
    setDetails([]); // Clear previous details to ensure dynamic fetch
    try {
      const prompt = `Provide up to 2 concise bullet points explaining the job role of ${title}. Include one point for key responsibilities and one for required skills or work environment. Respond only with bullet points starting with "- ".`;
      console.log("Sending prompt to Gemini API for Learn More:", prompt);

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      console.log("Raw response from Gemini API for Learn More:", text);

      const points = text
        .split("\n")
        .filter((line) => line.trim().startsWith("- "))
        .map((line) => line.replace("- ", "").trim())
        .slice(0, 2); // Limit to 2 bullet points

      setDetails(points.length >= 1 ? points : ["- No detailed information available."]);
    } catch (error) {
      console.error("Error fetching job details:", error.message);
      setDetails(["- Error fetching details. Please try again."]);
    } finally {
      setIsLoading(false);
      setShowDetails(true); // Show dropdown after fetching
    }
  };

  const handleToggleDetails = () => {
    if (showDetails) {
      setShowDetails(false);
      setDetails([]); // Clear details when closing
    } else {
      handleLearnMore(); // Fetch new details when opening
    }
  };

  const displayTitle = title.includes(":") ? title.substring(0, title.indexOf(":") + 1).trim() : title;

  return (
    <div className="w-72 p-6 bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-teal-100">
      {/* Job Title */}
      <h3 className="text-xl font-semibold text-teal-900 text-center mb-6 text-wrap">
        {displayTitle}
      </h3>

      {/* Buttons */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={handleToggleDetails}
          disabled={isLoading}
          className="px-4 py-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 transition-colors duration-200 disabled:bg-teal-300 text-sm font-medium"
        >
          {isLoading ? "Loading..." : showDetails ? "Hide Details" : "Learn More"}
        </button>
        <button
          onClick={() => onSelect(title)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors duration-200 ${
            isSelected
              ? "bg-green-500 text-white hover:bg-green-600"
              : "bg-gray-200 text-gray-800 hover:bg-gray-300"
          }`}
        >
          {isSelected ? "Selected" : "Select"}
        </button>
      </div>

      {/* Dropdown for Learn More Details */}
      {showDetails && (
        <div className="mt-4 p-4 bg-teal-50 rounded-lg border border-teal-200 transition-all duration-300">
          <ul className="list-disc pl-5 text-gray-700 text-base">
            {details.map((point, index) => (
              <li key={index} className="mb-2">{point}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default JobCard;