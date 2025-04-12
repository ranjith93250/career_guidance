import { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

const JobCard = ({ title, onSelect, isSelected }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState({
    responsibilities: [],
    skillsEnvironment: [],
    demandInsights: [],
    salaryRange: "",
    qualifications: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const handleLearnMore = async () => {
    setIsLoading(true);
    setDetails({
      responsibilities: [],
      skillsEnvironment: [],
      demandInsights: [],
      salaryRange: "",
      qualifications: [],
    }); // Clear previous details

    try {
      const prompt = `Provide concise details for the job role "${title}". Include:
        - At least 1 bullet point for key responsibilities (e.g., managing projects, analyzing data).
        - At least 1 bullet point for required skills or work environment (e.g., analytical skills, collaborative setting).
        - At least 1 bullet point for job demand insights (e.g., growth trends, market need).
        - A single line for approximate salary range (e.g., "$50,000 - $80,000 per year").
        - At least 1 bullet point for qualification requirements (e.g., bachelor's degree, certification).
        Respond only with bullet points starting with "- " for lists, and a single line starting with "Salary Range: " for salary. Ensure all sections are populated.`;

      console.log("Sending prompt to Gemini API for Learn More:", prompt);

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      console.log("Raw response from Gemini API for Learn More:", text);

      const lines = text.split("\n").map((line) => line.trim());
      const parsedDetails = {
        responsibilities: [],
        skillsEnvironment: [],
        demandInsights: [],
        salaryRange: "",
        qualifications: [],
      };

      // Parse based on order and content
      let currentSection = null;
      lines.forEach((line, index) => {
        if (line.startsWith("- ")) {
          const content = line.replace("- ", "").trim();
          if (!currentSection && index < lines.length / 5) currentSection = "responsibilities";
          else if (currentSection === "responsibilities" && parsedDetails.responsibilities.length < 2) currentSection = "responsibilities";
          else if (currentSection === "responsibilities" && parsedDetails.skillsEnvironment.length < 2) currentSection = "skillsEnvironment";
          else if (currentSection === "skillsEnvironment" && parsedDetails.demandInsights.length < 2) currentSection = "demandInsights";
          else if (currentSection === "demandInsights" && parsedDetails.qualifications.length < 2) currentSection = "qualifications";

          if (currentSection === "responsibilities") parsedDetails.responsibilities.push(content);
          else if (currentSection === "skillsEnvironment") parsedDetails.skillsEnvironment.push(content);
          else if (currentSection === "demandInsights") parsedDetails.demandInsights.push(content);
          else if (currentSection === "qualifications") parsedDetails.qualifications.push(content);
        } else if (line.startsWith("Salary Range: ")) {
          parsedDetails.salaryRange = line.replace("Salary Range: ", "").trim();
        }
      });

      // Ensure at least one item per category with meaningful fallbacks
      setDetails({
        responsibilities: parsedDetails.responsibilities.length >= 1
          ? parsedDetails.responsibilities
          : ["- Performing core duties related to the job role."],
        skillsEnvironment: parsedDetails.skillsEnvironment.length >= 1
          ? parsedDetails.skillsEnvironment
          : ["- Basic skills and a standard work environment required."],
        demandInsights: parsedDetails.demandInsights.length >= 1
          ? parsedDetails.demandInsights
          : ["- Moderate demand based on industry trends."],
        salaryRange: parsedDetails.salaryRange || "Salary Range: $40,000 - $70,000 per year (estimated)",
        qualifications: parsedDetails.qualifications.length >= 1
          ? parsedDetails.qualifications
          : ["- High school diploma or equivalent required."],
      });
    } catch (error) {
      console.error("Error fetching job details:", error.message);
      setDetails({
        responsibilities: ["- Error fetching responsibilities. Please try again."],
        skillsEnvironment: ["- Error fetching skills/environment. Please try again."],
        demandInsights: ["- Error fetching demand insights. Please try again."],
        salaryRange: "Salary Range: Not available.",
        qualifications: ["- Error fetching qualifications. Please try again."],
      });
    } finally {
      setIsLoading(false);
      setShowDetails(true);
    }
  };

  const handleToggleDetails = () => {
    if (showDetails) {
      setShowDetails(false);
      setDetails({
        responsibilities: [],
        skillsEnvironment: [],
        demandInsights: [],
        salaryRange: "",
        qualifications: [],
      }); // Clear details when closing
    } else {
      handleLearnMore(); // Fetch new details when opening
    }
  };

  const displayTitle = title.includes(":")
    ? title.substring(0, title.indexOf(":") + 1).trim()
    : title;

  // Get a random career-related icon for visual appeal
  const getCareerIcon = () => {
    const icons = [
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>,
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>,
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>,
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>,
      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ];
    
    // Use the first letter of the job title to select an icon (simple hash function)
    const firstChar = displayTitle.charAt(0).toLowerCase();
    const index = firstChar.charCodeAt(0) % icons.length;
    return icons[index];
  };

  // Calculate a background gradient based on the job title for visual diversity
  const getCardGradient = () => {
    const gradients = [
      "from-teal-50 to-blue-50",
      "from-teal-50 to-emerald-50",
      "from-cyan-50 to-blue-50",
      "from-teal-50 to-cyan-50",
      "from-emerald-50 to-teal-50",
    ];
    
    // Simple hash function based on job title
    let hash = 0;
    for (let i = 0; i < displayTitle.length; i++) {
      hash = displayTitle.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return gradients[Math.abs(hash) % gradients.length];
  };

  return (
    <div 
      className={`w-80 rounded-xl transition-all duration-300 transform hover:-translate-y-2 ${
        isSelected 
          ? "shadow-lg shadow-teal-200 scale-105"
          : "shadow-md hover:shadow-lg"
      }`}>
      <div className={`p-6 bg-gradient-to-br ${getCardGradient()} rounded-xl border ${
        isSelected ? "border-teal-400" : "border-gray-100"
      }`}>
        {/* Card header */}
        <div className="flex items-center mb-4">
          <div className="p-2 bg-white rounded-lg shadow-sm mr-3">
            {getCareerIcon()}
          </div>
          <h3 className="text-xl font-bold text-teal-900 flex-1">
            {displayTitle}
          </h3>
        </div>

        {/* Selected badge */}
        {isSelected && (
          <div className="bg-teal-100 text-teal-800 text-xs font-medium px-2.5 py-1 rounded-full inline-flex items-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Selected
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2 mt-4">
          <button
            onClick={handleToggleDetails}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 ${
              showDetails
                ? "bg-teal-700 text-white hover:bg-teal-800"
                : "bg-teal-100 text-teal-800 hover:bg-teal-200"
            }`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading
              </span>
            ) : (
              <span className="flex items-center justify-center">
                {showDetails ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    Hide Details
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Learn More
                  </>
                )}
              </span>
            )}
          </button>
          <button
            onClick={() => onSelect(title)}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              isSelected
                ? "bg-green-600 text-white shadow-md shadow-green-100 hover:bg-green-700"
                : "bg-white text-teal-700 border border-teal-200 hover:border-teal-400 hover:bg-teal-50"
            }`}
          >
            {isSelected ? (
              <span className="flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Selected
              </span>
            ) : (
              <span>Select</span>
            )}
          </button>
        </div>

        {/* Job details accordion */}
        {showDetails && (
          <div className="mt-5 overflow-hidden transition-all duration-500 ease-in-out max-h-[1000px]">
            <div className="p-4 bg-white rounded-lg shadow-inner border border-teal-100">
              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-bold text-teal-800 flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Responsibilities
                  </h5>
                  <ul className="list-none text-gray-700 text-sm">
                    {details.responsibilities.map((point, index) => (
                      <li key={index} className="mb-1 flex items-start">
                        <span className="text-teal-500 mr-2">•</span>
                        <span>{point.replace("- ", "")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="text-sm font-bold text-teal-800 flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Skills/Environment
                  </h5>
                  <ul className="list-none text-gray-700 text-sm">
                    {details.skillsEnvironment.map((point, index) => (
                      <li key={index} className="mb-1 flex items-start">
                        <span className="text-teal-500 mr-2">•</span>
                        <span>{point.replace("- ", "")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="text-sm font-bold text-teal-800 flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Job Demand
                  </h5>
                  <ul className="list-none text-gray-700 text-sm">
                    {details.demandInsights.map((point, index) => (
                      <li key={index} className="mb-1 flex items-start">
                        <span className="text-teal-500 mr-2">•</span>
                        <span>{point.replace("- ", "")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 className="text-sm font-bold text-teal-800 flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Salary Range
                  </h5>
                  <p className="text-gray-700 text-sm font-medium">{details.salaryRange.replace("Salary Range: ", "")}</p>
                </div>
                <div>
                  <h5 className="text-sm font-bold text-teal-800 flex items-center mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M12 14l9-5-9-5-9 5 9 5z" />
                      <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                    </svg>
                    Qualifications
                  </h5>
                  <ul className="list-none text-gray-700 text-sm">
                    {details.qualifications.map((point, index) => (
                      <li key={index} className="mb-1 flex items-start">
                        <span className="text-teal-500 mr-2">•</span>
                        <span>{point.replace("- ", "")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JobCard;