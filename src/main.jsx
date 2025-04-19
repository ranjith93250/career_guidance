import "bootstrap/dist/css/bootstrap.min.css";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { UserProvider } from './contexts/UserContext.jsx'

// Clear any data from previous sessions on initial load
// This ensures we always start with a clean slate
const clearInitialData = () => {
  // Check if this is a fresh page load (not a hot reload during development)
  if (!window.hasCleanedLocalStorage) {
    console.log("Clearing localStorage on initial page load");
    
    // Get all localStorage keys
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('career_guidance_')) {
        keysToRemove.push(key);
      }
    }
    
    // Remove all career guidance related keys
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Also remove other related items
    localStorage.removeItem('quiz_completed');
    localStorage.removeItem('suggested_jobs');
    
    // Set flag to prevent clearing on hot reloads
    window.hasCleanedLocalStorage = true;
  }
};

// Run the cleanup
clearInitialData();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <UserProvider>
      <App />
    </UserProvider>
  </React.StrictMode>
);