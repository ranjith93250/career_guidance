import { useState } from "react";

const SearchFilters = ({ onApplyFilters }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    categories: [],
    salaryRange: [0, 25],
    location: "Any",
    requiredEducation: "Any"
  });

  const categories = [
    { id: "tech", label: "Technology" },
    { id: "health", label: "Healthcare" },
    { id: "business", label: "Business" },
    { id: "arts", label: "Arts & Design" },
    { id: "education", label: "Education" },
    { id: "engineering", label: "Engineering" },
    { id: "science", label: "Science" },
    { id: "law", label: "Legal" },
    { id: "media", label: "Media & Entertainment" },
    { id: "hospitality", label: "Hospitality & Tourism" }
  ];

  const locations = [
    "Any", 
    "Remote", 
    "Onsite", 
    "Hybrid", 
    "International", 
    "Bangalore", 
    "Delhi", 
    "Mumbai", 
    "Hyderabad", 
    "Chennai", 
    "Pune"
  ];
  
  const educationLevels = [
    "Any", 
    "High School", 
    "Bachelor's", 
    "Master's", 
    "Doctorate", 
    "Professional Certification", 
    "Diploma"
  ];

  const handleCategoryChange = (categoryId) => {
    setFilters(prev => {
      const updatedCategories = prev.categories.includes(categoryId)
        ? prev.categories.filter(id => id !== categoryId)
        : [...prev.categories, categoryId];
      
      return {
        ...prev,
        categories: updatedCategories
      };
    });
  };

  const handleSalaryChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setFilters(prev => ({
      ...prev,
      salaryRange: [0, value]
    }));
  };

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleApplyFilters = () => {
    onApplyFilters(filters);
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setFilters({
      categories: [],
      salaryRange: [0, 25],
      location: "Any",
      requiredEducation: "Any"
    });
  };

  // Helper to get count of active filters
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.categories.length > 0) count++;
    if (filters.salaryRange[1] !== 25) count++;
    if (filters.location !== "Any") count++;
    if (filters.requiredEducation !== "Any") count++;
    return count;
  };

  return (
    <div className="w-full mb-4">
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 text-teal-600 hover:text-teal-800 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>
        
        {getActiveFilterCount() > 0 && (
          <div className="flex items-center">
            <span className="text-sm text-gray-500">
              {getActiveFilterCount()} {getActiveFilterCount() === 1 ? "filter" : "filters"} applied
            </span>
            <button 
              onClick={handleResetFilters}
              className="ml-2 text-xs text-teal-600 hover:text-teal-800 underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>
      
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow-md mb-4 transition-all">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Career Categories */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Career Categories</h3>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2">
                {categories.map(category => (
                  <div key={category.id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`category-${category.id}`}
                      checked={filters.categories.includes(category.id)}
                      onChange={() => handleCategoryChange(category.id)}
                      className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                    />
                    <label htmlFor={`category-${category.id}`} className="ml-2 text-sm text-gray-700">
                      {category.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Salary Range */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Salary Range (₹ Lakhs per year)</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">₹0</span>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={filters.salaryRange[1]}
                    onChange={handleSalaryChange}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-xs text-gray-500">₹{filters.salaryRange[1]}+</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Entry Level</span>
                  <span>Mid-Level</span>
                  <span>Senior Level</span>
                </div>
              </div>
            </div>
            
            {/* Work Location */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Work Location</h3>
              <select
                name="location"
                value={filters.location}
                onChange={handleSelectChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 text-sm"
              >
                {locations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Filter jobs by work location or work mode</p>
            </div>
            
            {/* Required Education */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Required Education</h3>
              <select
                name="requiredEducation"
                value={filters.requiredEducation}
                onChange={handleSelectChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500 text-sm"
              >
                {educationLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Minimum education level needed</p>
            </div>
          </div>
          
          <div className="flex justify-end mt-4 space-x-2">
            <button
              onClick={handleResetFilters}
              className="px-3 py-1.5 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Reset Filters
            </button>
            <button
              onClick={handleApplyFilters}
              className="px-3 py-1.5 text-sm bg-teal-600 text-white rounded-md hover:bg-teal-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
          
          {/* Active Filters Summary */}
          {getActiveFilterCount() > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-700 mb-1">Active Filters:</div>
              <div className="flex flex-wrap gap-2">
                {filters.categories.length > 0 && (
                  <div className="px-2 py-1 bg-teal-50 text-teal-700 rounded-full text-xs border border-teal-100">
                    Categories: {filters.categories.length} selected
                  </div>
                )}
                {filters.salaryRange[1] !== 25 && (
                  <div className="px-2 py-1 bg-teal-50 text-teal-700 rounded-full text-xs border border-teal-100">
                    Salary: Up to ₹{filters.salaryRange[1]} lakhs
                  </div>
                )}
                {filters.location !== "Any" && (
                  <div className="px-2 py-1 bg-teal-50 text-teal-700 rounded-full text-xs border border-teal-100">
                    Location: {filters.location}
                  </div>
                )}
                {filters.requiredEducation !== "Any" && (
                  <div className="px-2 py-1 bg-teal-50 text-teal-700 rounded-full text-xs border border-teal-100">
                    Education: {filters.requiredEducation}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchFilters; 