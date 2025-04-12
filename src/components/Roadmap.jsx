import { useState, useEffect, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useUserContext } from "../contexts/UserContext";
// Import html2canvas and jspdf conditionally to handle potential import errors
let html2canvas;
let jsPDF;

// Dynamic import to avoid errors during build/load time
const loadDependencies = async () => {
  try {
    html2canvas = (await import('html2canvas')).default;
    jsPDF = (await import('jspdf')).default;
    return true;
  } catch (error) {
    console.error("Error loading PDF dependencies:", error);
    return false;
  }
};

const Roadmap = ({ jobTitle, currentGrade }) => {
  const roadmapRef = useRef(null);
  const [roadmap, setRoadmap] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeStep, setActiveStep] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [resources, setResources] = useState([]);
  const [expandedResources, setExpandedResources] = useState(false);
  const [progress, setProgress] = useState(0);
  const [regenerateCount, setRegenerateCount] = useState(0);

  const { getCompletedSteps, toggleStepCompletion, addViewedCareer } = useUserContext();
  const completedSteps = getCompletedSteps(jobTitle);

  // Check if API key exists
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const hasApiKey = !!apiKey;

  useEffect(() => {
    // Log viewed career for analytics
    if (jobTitle) {
      addViewedCareer(jobTitle);
    }
  }, [jobTitle, addViewedCareer]);

  // Initialize API if key exists
  const genAI = hasApiKey ? new GoogleGenerativeAI(apiKey) : null;
  const model = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) : null;

  // Calculate progress percentage
  useEffect(() => {
    if (roadmap.length > 0) {
      const percentage = Math.round((completedSteps.length / roadmap.length) * 100);
      setProgress(percentage);
    }
  }, [completedSteps, roadmap]);

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
    setRegenerateCount(prev => prev + 1);

    if (!hasApiKey) {
      setError("API key is missing. Please add your Gemini API key to the environment variables.");
      setIsLoading(false);
      // Set fallback roadmap
      setRoadmap(getFallbackRoadmap());
      return;
    }

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
      fetchResources(cleanJobTitle);
    } catch (error) {
      console.error("Error generating roadmap:", error.message); // Log the error
      setError("Failed to generate roadmap. Please try again or check your API key.");
      // Set fallback roadmap based on career type
      setRoadmap(getFallbackRoadmap(jobTitle));
    } finally {
      setIsLoading(false);
    }
  };

  // Get fallback roadmap based on career type
  const getFallbackRoadmap = (title = '') => {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('doctor') || lowerTitle.includes('medical') || lowerTitle.includes('health')) {
      return [
        "Complete 10th grade with strong science scores",
        "Prepare for NEET: Study biology, chemistry, and physics",
        "Enroll in MBBS at AIIMS or similar top college",
        "Complete medical residency program",
        "Obtain medical license and start practice",
      ];
    } else if (lowerTitle.includes('engineer') || lowerTitle.includes('tech')) {
      return [
        "Focus on math and science in high school",
        "Prepare for JEE or other engineering entrance exams",
        "Enroll in a B.Tech program at a good engineering college",
        "Complete internships in your field of interest",
        "Pursue specialized certifications or higher education",
      ];
    } else if (lowerTitle.includes('business') || lowerTitle.includes('management')) {
      return [
        "Focus on business studies and economics in school",
        "Develop leadership skills through extracurricular activities",
        "Pursue a BBA or B.Com degree from a reputed institution",
        "Gain practical experience through internships",
        "Consider MBA or specialized business certifications",
      ];
    } else {
      return [
        "Complete high school with good academic performance",
        "Research colleges and entrance requirements for your field",
        "Pursue relevant bachelor's degree or vocational training",
        "Gain practical experience through internships or part-time work",
        "Build professional network and continue skill development",
      ];
    }
  };

  const fetchResources = async (career) => {
    if (!hasApiKey) {
      setResources(getFallbackResources(career));
      return;
    }

    try {
      const prompt = `Suggest 3-5 specific online resources (like websites, courses, or tools) for students interested in pursuing a career as a ${career}. For each resource, provide: 1) The name of the resource, 2) A very brief description (10 words max), and 3) What makes it valuable. Format as a bullet list with resource name in bold followed by description and value. Be concise and focus on quality resources only.`;
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      // Extract resources from the text
      const resourceList = text
        .split('\n')
        .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
        .map(line => {
          // Extract the name from the bold formatting if present
          const boldMatch = line.match(/\*\*(.*?)\*\*/);
          const name = boldMatch ? boldMatch[1] : line.replace(/^[-*]\s*/, '').split(':')[0].trim();
          
          // Get the description
          const description = line.replace(/^[-*]\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1').trim();
          
          // Check if URL is present
          const urlMatch = description.match(/https?:\/\/[^\s]+/);
          const url = urlMatch ? urlMatch[0] : '';
          
          // Clean description by removing the URL if present
          const cleanDescription = description.replace(urlMatch ? urlMatch[0] : '', '').trim();
          
          return { 
            name, 
            description: cleanDescription, 
            url
          };
        });
      
      setResources(resourceList);
    } catch (error) {
      console.error("Error fetching resources:", error.message);
      setResources(getFallbackResources(career));
    }
  };

  // Get fallback resources based on career
  const getFallbackResources = (career) => {
    const lowerCareer = career.toLowerCase();
    
    if (lowerCareer.includes('doctor') || lowerCareer.includes('medical')) {
      return [
        { name: "Khan Academy Medicine", description: "Free courses on medical topics", url: "https://www.khanacademy.org/science/health-and-medicine" },
        { name: "Coursera Health Courses", description: "University-level courses on healthcare", url: "https://www.coursera.org/browse/health" },
        { name: "NEET Preparation Resources", description: "Study materials for medical entrance exams", url: "" }
      ];
    } else if (lowerCareer.includes('engineer') || lowerCareer.includes('tech')) {
      return [
        { name: "MIT OpenCourseWare", description: "Free engineering courses from MIT", url: "https://ocw.mit.edu/search/?d=Electrical%20Engineering%20and%20Computer%20Science" },
        { name: "Codecademy", description: "Interactive coding lessons for beginners", url: "https://www.codecademy.com/" },
        { name: "JEE Preparation Materials", description: "Study resources for engineering entrance", url: "" }
      ];
    } else {
      return [
        { name: "LinkedIn Learning", description: "Professional courses on various topics", url: "https://www.linkedin.com/learning/" },
        { name: "Coursera", description: "University courses on diverse subjects", url: "https://www.coursera.org/" },
        { name: "Career One Stop", description: "Career exploration and planning tools", url: "https://www.careeronestop.org/" }
      ];
    }
  };

  const handleStepClick = (index) => {
    setActiveStep(activeStep === index ? null : index);
  };

  const handleToggleCompletion = (index) => {
    toggleStepCompletion(jobTitle, index);
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

  // Export roadmap as PDF
  const exportAsPDF = async () => {
    if (!roadmapRef.current) return;
    
    setIsExporting(true);
    
    // Try to load dependencies if they're not already loaded
    const dependenciesLoaded = html2canvas ? true : await loadDependencies();
    
    if (!dependenciesLoaded) {
      alert("PDF export is currently unavailable. Please try again later.");
      setIsExporting(false);
      return;
    }
    
    try {
      const canvas = await html2canvas(roadmapRef.current, {
        scale: 2,
        useCORS: true,
        scrollX: 0,
        scrollY: -window.scrollY,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 30;
      
      pdf.setFontSize(18);
      pdf.text(`Career Roadmap: ${jobTitle}`, pdfWidth / 2, 15, { align: 'center' });
      pdf.setFontSize(12);
      pdf.text(`For Grade ${currentGrade} Student`, pdfWidth / 2, 22, { align: 'center' });
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      // Add resources if available
      if (resources.length > 0) {
        const resourceY = imgY + imgHeight * ratio + 20;
        pdf.setFontSize(14);
        pdf.text('Recommended Resources:', 14, resourceY);
        pdf.setFontSize(10);
        
        resources.forEach((resource, index) => {
          pdf.text(`${index + 1}. ${resource.name}`, 14, resourceY + 10 + (index * 7));
          pdf.text(`   ${resource.description}`, 14, resourceY + 14 + (index * 7));
          if (resource.url) {
            pdf.setTextColor(0, 0, 255);
            pdf.text(`   ${resource.url}`, 14, resourceY + 18 + (index * 7));
            pdf.setTextColor(0, 0, 0);
          }
        });
      }
      
      // Add footer with date
      pdf.setFontSize(8);
      pdf.text(`Generated on ${new Date().toLocaleDateString()}`, pdfWidth / 2, pdfHeight - 10, { align: 'center' });
      
      pdf.save(`Career_Roadmap_${jobTitle.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Share roadmap functionality
  const shareRoadmap = () => {
    if (navigator.share) {
      navigator.share({
        title: `Career Roadmap for ${jobTitle}`,
        text: `Check out this career roadmap for becoming a ${jobTitle}`,
        url: window.location.href,
      })
      .then(() => console.log('Successful share'))
      .catch((error) => console.log('Error sharing:', error));
    } else {
      // Fallback for browsers that don't support sharing
      const url = window.location.href;
      navigator.clipboard.writeText(url)
        .then(() => alert('Link copied to clipboard!'))
        .catch(err => console.error('Failed to copy:', err));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg mt-8" ref={roadmapRef}>
      <h3 className="text-2xl font-bold text-teal-800 mb-6 text-center">
        Roadmap to{" "}
        {jobTitle
          .replace(/^\d+\.\s*\*\*|\*\*/g, "") // Remove numbering and ** markers
          .replace(/:.*$/, "") // Remove trailing colon and anything after it
          .trim()}{" "}
        (Grade {currentGrade})
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
          {/* Progress bar */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-teal-700">Your Progress</span>
              <span className="text-sm font-medium text-teal-700">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-teal-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        
          <div className="flex justify-between mb-4">
            <div className="flex space-x-2">
              <button
                onClick={generateRoadmap}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerate
              </button>
              
              <button
                onClick={exportAsPDF}
                disabled={isExporting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export PDF
                  </>
                )}
              </button>
              
              <button
                onClick={shareRoadmap}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
            </div>
            
            <div className="flex items-center">
              <div className="flex items-center space-x-2 mr-2">
                <div className="w-4 h-4 bg-teal-600 rounded-full"></div>
                <span className="text-xs text-gray-600">Complete</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-gray-300 rounded-full"></div>
                <span className="text-xs text-gray-600">Incomplete</span>
              </div>
            </div>
          </div>
          
          {roadmap.length > 0 && (
            <div className="relative py-8">
              {/* Timeline line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-teal-200 transform -translate-x-1/2"></div>
              
              {roadmap.map((step, index) => {
                const isActive = activeStep === index;
                const isCompleted = completedSteps.includes(index);
                const stageLabels = getCareerStageLabels();
                const isLeftSide = index % 2 === 0;
                
                return (
                  <div key={index} className={`relative flex items-center mb-12 ${isLeftSide ? 'justify-start' : 'justify-end'}`}>
                    {/* Timeline dot */}
                    <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col items-center">
                      <div 
                        className={`w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 ${
                          isCompleted 
                            ? 'bg-teal-600 scale-110' 
                            : isActive 
                              ? 'bg-teal-400 scale-125' 
                              : 'bg-gray-300 hover:bg-teal-300'
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
                          : isCompleted
                            ? 'bg-white border-2 border-teal-200 hover:border-teal-300'
                            : 'bg-white border border-gray-200 hover:border-teal-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="text-lg font-semibold text-teal-800 mb-2 flex-1">{step}</h4>
                        <button 
                          onClick={() => handleToggleCompletion(index)}
                          className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                          title={isCompleted ? "Mark as incomplete" : "Mark as complete"}
                        >
                          {isCompleted ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>
                      </div>
                      
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
          
          {/* Resources section */}
          {resources.length > 0 && (
            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div 
                className="flex justify-between items-center cursor-pointer"
                onClick={() => setExpandedResources(!expandedResources)}
              >
                <h4 className="text-lg font-semibold text-blue-800">Helpful Resources</h4>
                <button className="p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-blue-600 transform transition-transform ${expandedResources ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
              
              {expandedResources && (
                <div className="mt-3 space-y-3">
                  {resources.map((resource, index) => (
                    <div key={index} className="p-3 bg-white rounded-lg shadow-sm">
                      <h5 className="font-semibold text-blue-700">{resource.name}</h5>
                      <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                      {resource.url && (
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 mt-1 inline-block"
                        >
                          Visit Resource →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Next Steps and Motivation */}
          <div className="mt-8 p-4 bg-green-50 rounded-lg border border-green-100">
            <h4 className="text-lg font-semibold text-green-800 mb-2">Keep Going!</h4>
            <p className="text-sm text-gray-700 mb-3">
              Complete each step on your roadmap to track your progress. Remember, every career journey is unique - 
              this roadmap is a guide, but don't be afraid to explore opportunities and adjust your path as you learn more.
            </p>
            <div className="text-sm text-gray-600 italic">
              "The future belongs to those who believe in the beauty of their dreams." - Eleanor Roosevelt
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Roadmap;