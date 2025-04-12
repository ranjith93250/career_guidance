import { useState, useEffect } from "react";
import { useUserContext } from "../contexts/UserContext";
import JobCard from "./JobCard";

const ProfileSection = ({ onSelectJob }) => {
  const { userData, updateProfile, isFavoriteJob, toggleFavoriteJob } = useUserContext();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: userData.name,
    email: userData.email,
    grade: userData.grade
  });

  // Update form data when userData changes
  useEffect(() => {
    setFormData({
      name: userData.name,
      email: userData.email,
      grade: userData.grade
    });
  }, [userData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'grade' ? Number(value) : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateProfile(formData);
    setIsEditing(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-teal-800">Your Profile</h2>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 text-sm text-teal-600 hover:text-teal-800 transition-colors"
          >
            {isEditing ? "Cancel" : "Edit Profile"}
          </button>
        </div>

        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Your Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Your Email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
              <select
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value={10}>Grade 10</option>
                <option value={11}>Grade 11</option>
                <option value={12}>Grade 12</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              Save Changes
            </button>
          </form>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-teal-200 flex items-center justify-center mr-4">
                <span className="text-teal-800 font-bold">
                  {userData.name ? userData.name.charAt(0).toUpperCase() : "U"}
                </span>
              </div>
              <div>
                <h3 className="font-medium text-gray-800">{userData.name || "User"}</h3>
                <p className="text-sm text-gray-500">{userData.email || "No email provided"}</p>
                <p className="text-sm text-gray-500">Grade {userData.grade}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Favorites section */}
      <div className="p-6">
        <h3 className="text-xl font-semibold text-teal-800 mb-4">
          Saved Careers
        </h3>
        {userData.favoriteJobs.length > 0 ? (
          <div className="space-y-4">
            {userData.favoriteJobs.map((jobTitle, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                  <h4 className="font-medium text-gray-800">{jobTitle}</h4>
                  <div className="flex space-x-2 mt-1">
                    <button
                      onClick={() => onSelectJob(jobTitle)}
                      className="text-xs px-2 py-1 bg-teal-100 text-teal-800 rounded hover:bg-teal-200 transition-colors"
                    >
                      View Roadmap
                    </button>
                    <button
                      onClick={() => toggleFavoriteJob(jobTitle)}
                      className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-xs px-2 py-1 bg-teal-50 text-teal-800 rounded">
                    Grade {userData.grade}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No saved careers yet</p>
            <p className="text-sm text-gray-400 mt-2">Click the ❤️ icon on any career to save it</p>
          </div>
        )}
      </div>

      {/* Recent searches */}
      {userData.previousSearches.length > 0 && (
        <div className="p-6 border-t border-gray-200">
          <h3 className="text-xl font-semibold text-teal-800 mb-4">
            Recent Searches
          </h3>
          <div className="flex flex-wrap gap-2">
            {userData.previousSearches.map((search, index) => (
              <span 
                key={index}
                className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm cursor-pointer hover:bg-gray-200 transition-colors"
                onClick={() => document.querySelector('input[placeholder*="Search for a career"]').value = search}
              >
                {search}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Recently viewed */}
      {userData.viewedCareers.length > 0 && (
        <div className="p-6 border-t border-gray-200">
          <h3 className="text-xl font-semibold text-teal-800 mb-4">
            Recently Viewed
          </h3>
          <div className="space-y-2">
            {userData.viewedCareers.map((career, index) => (
              <div 
                key={index}
                className="p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => onSelectJob(career)}
              >
                <div className="flex justify-between items-center">
                  <span className="text-gray-800">{career}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavoriteJob(career);
                    }}
                    className="text-xl"
                  >
                    {isFavoriteJob(career) ? "❤️" : "🤍"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSection; 