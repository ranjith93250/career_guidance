import { useState, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

const Roadmap = ({ jobTitle, currentGrade }) => {
  const [roadmap, setRoadmap] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(null);

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Auto-generate roadmap when job title changes
  useEffect(() => {
    if (jobTitle) {
      generateRoadmap();
    }
  }, [jobTitle]);

  const generateRoadmap = async () => {
    setIsLoading(true);
    setError(null);
    setRoadmap([]); // Reset roadmap on new request
    setActiveStep(null);

    try {
      // Clean the jobTitle by removing numbering, extra formatting, and trailing colon
      const cleanJobTitle = jobTitle
        .replace(/^\d+\.\s*\*\*|\*\*/g, "") // Remove numbering and ** markers
        .replace(/:.*$/, "") // Remove trailing colon and anything after it
        .trim();
      console.log("Cleaned Job Title:", cleanJobTitle); // Log the cleaned job title

      // Adjust the prompt to handle a broader range of careers
      const prompt = `Create a concise roadmap for a grade ${currentGrade} student to become a ${cleanJobTitle}. Provide exactly 5 key steps in bullet point format, with each line starting with "- " followed by the step description (e.g., "- Complete 10th grade with strong science scores"). If the career is specific to India (e.g., Medical Researcher), include important exams (e.g., NEET) and top colleges (e.g., AIIMS) where applicable. If the career is not specific to India (e.g., Enlisted Soldier), provide a general roadmap suitable for an international context, tailored for a student of the given grade. Do not include any introductory text, extra formatting, or steps outside the 5-key range. Respond only with the bullet points.`;
      console.log("Sending prompt to Gemini API:", prompt); // Log the prompt

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      console.log("Raw response from Gemini API:", text); // Log the raw response

      // Parse the response into bullet points with flexible matching
      const steps = text
        .split("\n")
        .filter((line) => line.trim() !== "" && (line.trim().startsWith("- ") || line.trim().startsWith("* ")))
        .map((line) => {
          // Remove bullet point markers (* or -) and trim
          const cleanedLine = line.replace(/^[-*]\s*/, "").trim();
          // Split on the first colon if present, otherwise use the whole line
          const [step] = cleanedLine.split(":").map((part) => part.trim());
          return step || cleanedLine;
        });

      if (steps.length < 5) {
        throw new Error(`Expected 5 steps, but got ${steps.length}. Response: ${text}`);
      }

      setRoadmap(steps);
    } catch (error) {
      console.error("Error generating roadmap:", error.message); // Log the error
      setError("Failed to generate roadmap. Please try again or check your API key.");
      setRoadmap([
        "Complete 10th grade with strong science scores",
        "Prepare for NEET: Study biology, chemistry, and physics",
        "Enroll in MBBS at AIIMS or similar top college",
        "Pursue a PhD in Medical Research",
        "Gain research experience through internships",
      ]); // Fallback roadmap for Medical Researcher
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepClick = (index) => {
    setActiveStep(activeStep === index ? null : index);
  };

  // Generate tips for a specific roadmap step
  const getStepTips = (stepIndex) => {
    const tips = [
      [
        "Focus on core subjects relevant to your career path",
        "Participate in extracurricular activities related to your interests",
        "Start researching colleges and requirements early",
      ],
      [
        "Create a structured study plan with specific goals",
        "Use a mix of resources (books, online courses, coaching)",
        "Join study groups or forums for peer learning",
      ],
      [
        "Research college rankings and specialization programs",
        "Prepare for entrance exams and interviews",
        "Apply for scholarships and financial aid",
      ],
      [
        "Network with professionals in your field",
        "Look for internship opportunities during breaks",
        "Focus on developing specialized knowledge",
      ],
      [
        "Build a professional portfolio or resume",
        "Join relevant professional associations",
        "Consider advanced certifications for your field",
      ],
    ];
    
    return tips[stepIndex] || [];
  };

  const getCareerStageLabels = () => {
    return ["Education", "Preparation", "Higher Education", "Specialization", "Career Entry"];
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg mt-8">
      <h3 className="text-2xl font-bold text-teal-800 mb-6 text-center">
        Roadmap to{" "}
        {jobTitle
          .replace(/^\d+\.\s*\*\*|\*\*/g, "") // Remove numbering and ** markers
          .replace(/:.*$/, "") // Remove trailing colon and anything after it
          .trim()}{" "}
        (Grades {currentGrade})
      </h3>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-teal-500 border-opacity-50"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 mb-6">
          <p className="text-red-600">{error}</p>
          <button
            onClick={generateRoadmap}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={generateRoadmap}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Regenerate
            </button>
          </div>
          
          {roadmap.length > 0 && (
            <div className="relative py-8">
              {/* Timeline line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-teal-200 transform -translate-x-1/2"></div>
              
              {roadmap.map((step, index) => {
                const isActive = activeStep === index;
                const stageLabels = getCareerStageLabels();
                const isLeftSide = index % 2 === 0;
                
                return (
                  <div key={index} className={`relative flex items-center mb-12 ${isLeftSide ? 'justify-start' : 'justify-end'}`}>
                    {/* Timeline dot */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${
                          isActive ? 'bg-teal-600 scale-125' : 'bg-teal-400 hover:bg-teal-500'
                        }`}
                        onClick={() => handleStepClick(index)}
                      >
                        <span className="text-white font-bold">{index + 1}</span>
                      </div>
                      <span className="text-xs font-semibold text-teal-700 mt-1">{stageLabels[index]}</span>
                    </div>
                    
                    {/* Content card */}
                    <div 
                      className={`w-5/12 p-4 rounded-lg shadow-md transition-all duration-300 ${
                        isActive 
                          ? 'bg-teal-50 border-2 border-teal-400' 
                          : 'bg-white border border-gray-200 hover:border-teal-300'
                      }`}
                    >
                      <h4 className="text-lg font-semibold text-teal-800 mb-2">{step}</h4>
                      
                      {isActive && (
                        <div className="mt-3 pt-3 border-t border-teal-200">
                          <h5 className="text-sm font-semibold text-teal-700 mb-2">Quick Tips:</h5>
                          <ul className="text-sm text-gray-700 space-y-1">
                            {getStepTips(index).map((tip, tipIndex) => (
                              <li key={tipIndex} className="flex items-start">
                                <span className="text-teal-500 mr-2">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Roadmap;