import { useState, useEffect } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { useUserContext } from "../contexts/UserContext";

const AnalyticsDashboard = ({ onSelectJob }) => {
  const { userData } = useUserContext();
  const [trendingCareers, setTrendingCareers] = useState([]);
  const [careerInsights, setCareerInsights] = useState([]);
  const [salaryData, setSalaryData] = useState([]);
  const [locationOpportunities, setLocationOpportunities] = useState([]);
  const [popularCareerStats, setPopularCareerStats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("trends");

  // Check if API key exists
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const hasApiKey = !!apiKey;

  // Initialize API if key exists
  const genAI = hasApiKey ? new GoogleGenerativeAI(apiKey) : null;
  const model = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) : null;

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      setIsLoading(true);
      
      try {
        await Promise.all([
          fetchTrendingCareers(),
          fetchCareerInsights(),
          fetchSalaryData(),
          fetchLocationOpportunities(),
          fetchPopularCareerStats()
        ]);
      } catch (error) {
        console.error("Error fetching analytics data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, []);

  const fetchTrendingCareers = async () => {
    if (!hasApiKey) {
      setTrendingCareers(getFallbackTrendingCareers());
      return;
    }
    
    try {
      const prompt = "List the 5 most in-demand careers for 2025 with brief explanations of why they're growing. Include estimated growth rate percentages. Format as a JSON array with objects containing 'title', 'growth' (as a number), and 'reason' properties. Only respond with the valid JSON array.";
      
      const result = await model.generateContent(prompt);
      const resultText = result.response.text();
      
      try {
        // Find JSON in the response text
        const jsonMatch = resultText.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : resultText;
        const parsedData = JSON.parse(jsonStr);
        
        if (Array.isArray(parsedData)) {
          setTrendingCareers(parsedData.map(item => ({
            ...item,
            growth: typeof item.growth === 'number' ? item.growth : parseInt(item.growth) || 0
          })));
        }
      } catch (e) {
        console.error("Error parsing trending careers JSON:", e);
        setTrendingCareers(getFallbackTrendingCareers());
      }
    } catch (error) {
      console.error("Error fetching trending careers:", error);
      setTrendingCareers(getFallbackTrendingCareers());
    }
  };

  const getFallbackTrendingCareers = () => {
    return [
      { title: "Data Scientist", growth: 35, reason: "Growing need for AI and machine learning specialists" },
      { title: "Healthcare Professional", growth: 28, reason: "Aging population and healthcare advancements" },
      { title: "Renewable Energy Engineer", growth: 25, reason: "Transition to sustainable energy sources" },
      { title: "Cybersecurity Specialist", growth: 33, reason: "Increased digital threats and data protection needs" },
      { title: "Digital Marketing Specialist", growth: 20, reason: "Expanding e-commerce and online presence requirements" }
    ];
  };

  const fetchCareerInsights = async () => {
    if (!hasApiKey) {
      setCareerInsights(getFallbackCareerInsights());
      return;
    }
    
    try {
      const prompt = "Provide 3 key career insights specifically for high school students. For each insight, include a title, description (2-3 sentences), and actionable tip. Format as JSON array with objects containing 'title', 'description', and 'tip' properties. Only respond with valid JSON.";
      
      const result = await model.generateContent(prompt);
      const resultText = result.response.text();
      
      try {
        const jsonMatch = resultText.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : resultText;
        const parsedData = JSON.parse(jsonStr);
        
        if (Array.isArray(parsedData)) {
          setCareerInsights(parsedData);
        }
      } catch (e) {
        console.error("Error parsing career insights JSON:", e);
        setCareerInsights(getFallbackCareerInsights());
      }
    } catch (error) {
      console.error("Error fetching career insights:", error);
      setCareerInsights(getFallbackCareerInsights());
    }
  };

  const getFallbackCareerInsights = () => {
    return [
      {
        title: "Start Early with Exploration",
        description: "Career decisions benefit from early exploration. Students who engage with different fields before college make more informed choices.",
        tip: "Try job shadowing, informational interviews, or volunteer work in areas of interest during school breaks."
      },
      {
        title: "Develop Transferable Skills",
        description: "Focus on skills that apply across multiple careers. Critical thinking, communication, and digital literacy are valuable in almost every profession.",
        tip: "Join debate clubs, writing workshops, or coding classes to build versatile skill sets regardless of your final career choice."
      },
      {
        title: "Consider Non-Traditional Paths",
        description: "College isn't the only route to success. Trade schools, certifications, and apprenticeships can lead to fulfilling, high-paying careers.",
        tip: "Research alternative education options that align with your interests and learning style."
      }
    ];
  };

  const fetchSalaryData = async () => {
    if (!hasApiKey) {
      setSalaryData(getFallbackSalaryData());
      return;
    }
    
    try {
      const prompt = "Provide annual average salary ranges in Indian Rupees (₹) for 7 different entry-level career fields for fresh graduates. Format as JSON array with objects containing 'field', 'minSalary', and 'maxSalary' properties (as numbers in lakhs). Only respond with valid JSON array.";
      
      const result = await model.generateContent(prompt);
      const resultText = result.response.text();
      
      try {
        const jsonMatch = resultText.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : resultText;
        const parsedData = JSON.parse(jsonStr);
        
        if (Array.isArray(parsedData)) {
          setSalaryData(parsedData.map(item => ({
            ...item,
            minSalary: typeof item.minSalary === 'number' ? item.minSalary : parseFloat(item.minSalary) || 3,
            maxSalary: typeof item.maxSalary === 'number' ? item.maxSalary : parseFloat(item.maxSalary) || 6
          })));
        }
      } catch (e) {
        console.error("Error parsing salary data JSON:", e);
        setSalaryData(getFallbackSalaryData());
      }
    } catch (error) {
      console.error("Error fetching salary data:", error);
      setSalaryData(getFallbackSalaryData());
    }
  };

  const getFallbackSalaryData = () => {
    return [
      { field: "Information Technology", minSalary: 4.5, maxSalary: 10 },
      { field: "Engineering", minSalary: 3.8, maxSalary: 8 },
      { field: "Finance & Banking", minSalary: 4, maxSalary: 9 },
      { field: "Healthcare", minSalary: 3.5, maxSalary: 7 },
      { field: "Marketing", minSalary: 3, maxSalary: 6 },
      { field: "Education", minSalary: 2.5, maxSalary: 5 },
      { field: "Hospitality", minSalary: 2, maxSalary: 4.5 }
    ];
  };
  
  const fetchLocationOpportunities = async () => {
    if (!hasApiKey) {
      setLocationOpportunities(getFallbackLocationOpportunities());
      return;
    }
    
    try {
      const prompt = "Provide a list of 5 regions in India with the most job opportunities for recent graduates. For each region, include the region name, top 2 in-demand career fields, and a brief reason for growth. Format as JSON array with objects containing 'region', 'topFields' (array of strings), and 'reason' properties. Only respond with valid JSON array.";
      
      const result = await model.generateContent(prompt);
      const resultText = result.response.text();
      
      try {
        const jsonMatch = resultText.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : resultText;
        const parsedData = JSON.parse(jsonStr);
        
        if (Array.isArray(parsedData)) {
          setLocationOpportunities(parsedData);
        }
      } catch (e) {
        console.error("Error parsing location opportunities JSON:", e);
        setLocationOpportunities(getFallbackLocationOpportunities());
      }
    } catch (error) {
      console.error("Error fetching location opportunities:", error);
      setLocationOpportunities(getFallbackLocationOpportunities());
    }
  };
  
  const getFallbackLocationOpportunities = () => {
    return [
      { 
        region: "Bangalore", 
        topFields: ["IT Services", "Startups"],
        reason: "India's Silicon Valley with the highest concentration of tech companies and startups"
      },
      { 
        region: "Mumbai", 
        topFields: ["Finance", "Media"],
        reason: "Financial capital with strong presence of banking, stock markets, and entertainment industry"
      },
      { 
        region: "Delhi-NCR", 
        topFields: ["Government", "Corporate"],
        reason: "Political center with numerous multinational corporations and government opportunities"
      },
      { 
        region: "Hyderabad", 
        topFields: ["IT", "Pharma"],
        reason: "Growing tech hub with HITEC City and strong pharmaceutical industry presence"
      },
      { 
        region: "Pune", 
        topFields: ["Manufacturing", "Education"],
        reason: "Major manufacturing hub with strong educational institutions and research centers"
      }
    ];
  };
  
  const fetchPopularCareerStats = async () => {
    if (!hasApiKey) {
      setPopularCareerStats(getFallbackPopularCareerStats());
      return;
    }
    
    try {
      const prompt = "Provide statistics for 5 popular career fields showing job satisfaction rating (1-10), work-life balance rating (1-10), and average experience needed for senior roles (in years). Format as JSON array with objects containing 'field', 'satisfaction', 'workLifeBalance', and 'seniorityYears' properties. Only respond with valid JSON array.";
      
      const result = await model.generateContent(prompt);
      const resultText = result.response.text();
      
      try {
        const jsonMatch = resultText.match(/\[[\s\S]*\]/);
        const jsonStr = jsonMatch ? jsonMatch[0] : resultText;
        const parsedData = JSON.parse(jsonStr);
        
        if (Array.isArray(parsedData)) {
          setPopularCareerStats(parsedData.map(item => ({
            ...item,
            satisfaction: typeof item.satisfaction === 'number' ? item.satisfaction : parseFloat(item.satisfaction) || 7,
            workLifeBalance: typeof item.workLifeBalance === 'number' ? item.workLifeBalance : parseFloat(item.workLifeBalance) || 6,
            seniorityYears: typeof item.seniorityYears === 'number' ? item.seniorityYears : parseFloat(item.seniorityYears) || 5
          })));
        }
      } catch (e) {
        console.error("Error parsing popular career stats JSON:", e);
        setPopularCareerStats(getFallbackPopularCareerStats());
      }
    } catch (error) {
      console.error("Error fetching popular career stats:", error);
      setPopularCareerStats(getFallbackPopularCareerStats());
    }
  };
  
  const getFallbackPopularCareerStats = () => {
    return [
      { field: "Software Development", satisfaction: 7.8, workLifeBalance: 6.5, seniorityYears: 5 },
      { field: "Medicine", satisfaction: 8.2, workLifeBalance: 5.8, seniorityYears: 8 },
      { field: "Finance", satisfaction: 7.4, workLifeBalance: 6.2, seniorityYears: 7 },
      { field: "Education", satisfaction: 8.5, workLifeBalance: 8.2, seniorityYears: 10 },
      { field: "Digital Marketing", satisfaction: 7.6, workLifeBalance: 7.4, seniorityYears: 4 }
    ];
  };

  const renderTrendingCareers = () => (
    <div className="mb-6">
      <h3 className="text-xl font-semibold text-teal-800 mb-4">
        Top Trending Careers for 2025
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {trendingCareers.map((career, index) => (
          <div 
            key={index} 
            className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onSelectJob(career.title)}
          >
            <div className="flex justify-between items-start">
              <h4 className="text-lg font-medium text-teal-700">{career.title}</h4>
              <span className="px-2 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-medium">
                +{career.growth}% Growth
              </span>
            </div>
            <p className="text-gray-600 mt-2 text-sm">{career.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCareerInsights = () => (
    <div className="mb-6">
      <h3 className="text-xl font-semibold text-teal-800 mb-4">
        Career Insights for Students
      </h3>
      <div className="space-y-4">
        {careerInsights.map((insight, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow-md">
            <h4 className="text-lg font-medium text-teal-700">{insight.title}</h4>
            <p className="text-gray-600 mt-2">{insight.description}</p>
            <div className="mt-3 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-sm">
              <span className="font-semibold">Tip:</span> {insight.tip}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSalaryData = () => (
    <div className="mb-6">
      <h3 className="text-xl font-semibold text-teal-800 mb-4">
        Entry-Level Salary Ranges (Annual in ₹ Lakhs)
      </h3>
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="flex items-center bg-teal-50 p-3 border-b border-teal-100">
          <div className="w-1/2 font-medium text-teal-800">Career Field</div>
          <div className="w-1/2 font-medium text-teal-800">Salary Range (₹ Lakhs)</div>
        </div>
        {salaryData.map((item, index) => (
          <div key={index} className={`flex items-center p-3 ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
            <div className="w-1/2 text-gray-700">{item.field}</div>
            <div className="w-1/2">
              <div className="flex items-center">
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-teal-600 h-2.5 rounded-full" 
                    style={{ width: `${((item.maxSalary - 0) / 12) * 100}%` }}
                  ></div>
                </div>
                <span className="ml-3 text-sm text-gray-700">₹{item.minSalary}-{item.maxSalary}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  
  const renderLocationOpportunities = () => (
    <div className="mb-6">
      <h3 className="text-xl font-semibold text-teal-800 mb-4">
        Top Locations for Job Opportunities
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locationOpportunities.map((location, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow-md">
            <h4 className="text-lg font-medium text-teal-700">{location.region}</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {location.topFields.map((field, i) => (
                <span key={i} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {field}
                </span>
              ))}
            </div>
            <p className="text-gray-600 mt-3 text-sm">{location.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
  
  const renderPopularCareerStats = () => (
    <div className="mb-6">
      <h3 className="text-xl font-semibold text-teal-800 mb-4">
        Career Satisfaction & Growth Metrics
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow-md overflow-hidden">
          <thead className="bg-teal-50 text-teal-800">
            <tr>
              <th className="py-3 px-4 text-left font-medium">Career Field</th>
              <th className="py-3 px-4 text-center font-medium">Job Satisfaction</th>
              <th className="py-3 px-4 text-center font-medium">Work-Life Balance</th>
              <th className="py-3 px-4 text-center font-medium">Years to Senior Role</th>
            </tr>
          </thead>
          <tbody>
            {popularCareerStats.map((stat, index) => (
              <tr key={index} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                <td className="py-3 px-4 border-t border-gray-200">{stat.field}</td>
                <td className="py-3 px-4 border-t border-gray-200 text-center">
                  <div className="flex items-center justify-center">
                    <span className="mr-2">{stat.satisfaction}/10</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${stat.satisfaction * 10}%` }}></div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 border-t border-gray-200 text-center">
                  <div className="flex items-center justify-center">
                    <span className="mr-2">{stat.workLifeBalance}/10</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${stat.workLifeBalance * 10}%` }}></div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 border-t border-gray-200 text-center">{stat.seniorityYears} years</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-teal-800">Career Analytics Dashboard</h2>
        {isLoading && (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-500"></div>
            <span className="ml-2 text-sm text-gray-600">Loading data...</span>
          </div>
        )}
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-teal-500 border-opacity-50"></div>
        </div>
      ) : (
        <>
          <div className="flex mb-6 border-b border-gray-200 overflow-x-auto">
            <button 
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'trends' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('trends')}
            >
              Career Trends
            </button>
            <button 
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'insights' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('insights')}
            >
              Student Insights
            </button>
            <button 
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'salary' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('salary')}
            >
              Salary Data
            </button>
            <button 
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'locations' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('locations')}
            >
              Location Opportunities
            </button>
            <button 
              className={`px-4 py-2 font-medium text-sm ${activeTab === 'stats' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('stats')}
            >
              Career Statistics
            </button>
          </div>
          
          {activeTab === 'trends' && renderTrendingCareers()}
          {activeTab === 'insights' && renderCareerInsights()}
          {activeTab === 'salary' && renderSalaryData()}
          {activeTab === 'locations' && renderLocationOpportunities()}
          {activeTab === 'stats' && renderPopularCareerStats()}
          
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 text-sm text-gray-700">
            <div className="font-semibold text-indigo-800 mb-1">Data Sources:</div>
            <p>Analysis based on current industry trends, educational statistics, and market research. Data is regularly updated to reflect changing market conditions.</p>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard; 