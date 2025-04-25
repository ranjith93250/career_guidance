import { useState, useEffect } from "react";
import { useUserContext } from "../contexts/UserContext";

const Login = ({ setIsLoggedIn, setGrade }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [selectedGrade, setSelectedGrade] = useState(10);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [redirectingToQuiz, setRedirectingToQuiz] = useState(false);
  const [redirectingToLogin, setRedirectingToLogin] = useState(false);
  const [showRedirectToRegister, setShowRedirectToRegister] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);

  const { login, register } = useUserContext();

  // Email validation function using regex
  const validateEmail = (email) => {
    // First check for basic email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    // Then specifically check if it ends with @gmail.com
    const isGmailAccount = email.toLowerCase().endsWith('@gmail.com');
    
    // Email must pass both tests - correct format AND be a gmail account
    return emailRegex.test(email) && isGmailAccount;
  };

  // Handle email input and validate in real-time
  const handleEmailChange = (e) => {
    const emailValue = e.target.value;
    setEmail(emailValue);
    
    // Only show validation error if there's input and it's invalid
    if (emailValue) {
      if (!validateEmail(emailValue)) {
        if (!emailValue.toLowerCase().endsWith('@gmail.com')) {
          setEmailError("Email must end with @gmail.com");
        } else {
          setEmailError("Invalid email format. Please use name@gmail.com");
        }
      } else {
        setEmailError("");
      }
    } else {
      setEmailError("");
    }
  };

  // If registration success is shown, redirect to login page after a delay
  useEffect(() => {
    if (registrationSuccess) {
      const timer = setTimeout(() => {
        setRedirectingToLogin(true);
        // Reset the registration form and go back to login
        setIsRegistering(false);
        setRegistrationSuccess(false);
        setName("");
        setPassword("");
        // Keep the email for convenience
        setMessage("Registration successful. Please login with your credentials.");
      }, 2000); // 2 second delay to show success message
      
      return () => clearTimeout(timer);
    }
  }, [registrationSuccess]);

  // Countdown effect for redirecting to registration
  useEffect(() => {
    if (showRedirectToRegister && redirectCountdown > 0) {
      const timer = setTimeout(() => {
        setRedirectCountdown(redirectCountdown - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (showRedirectToRegister && redirectCountdown === 0) {
      setIsRegistering(true);
      setShowRedirectToRegister(false);
      setRedirectCountdown(3);
    }
  }, [showRedirectToRegister, redirectCountdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset any previous messages
    setMessage("");
    setEmailError("");
    
    // Validate and sanitize email
    const sanitizedEmail = email.trim().toLowerCase();
    
    // Validate email format
    if (!validateEmail(sanitizedEmail)) {
      setEmailError("Invalid email format. Please use name@gmail.com");
      return;
    }
    
    setIsLoading(true);

    try {
      let result;

      if (isRegistering) {
        // Registration - this is a NEW user
        if (!name || !sanitizedEmail || !password || !selectedGrade) {
          setMessage("All fields are required");
          setIsLoading(false);
          return;
        }

        result = await register(name, sanitizedEmail, password, selectedGrade);
        if (result.success) {
          console.log("New user registered successfully:", sanitizedEmail);
          
          // Create the user object with isNew flag
          const user = {
            name: name,
            email: sanitizedEmail,
            grade: selectedGrade,
          };
          
          // Immediately login the new user and send them to the quiz
          setIsLoggedIn(user, true); // Pass TRUE to indicate this is a new user
          setGrade(selectedGrade);
        } else if (result.error && result.error.includes("already exists")) {
          setMessage("This email is already registered. Please login instead.");
        }
      } else {
        // Login - this is a RETURNING user
        if (!sanitizedEmail || !password) {
          setMessage("Email and password are required");
          setIsLoading(false);
          return;
        }

        try {
          result = await login(sanitizedEmail, password);
          if (result.success) {
            console.log("Returning user logged in:", sanitizedEmail);
            
            // For returning users, pass the user profile
            const userGrade = result.user?.grade || 10;
            const user = {
              ...(result.user || {}),
              email: sanitizedEmail,
              grade: userGrade,
            };
            
            // Pass FALSE to indicate this is NOT a new user
            setIsLoggedIn(user, false);
            setGrade(userGrade);
          }
        } catch (error) {
          // Check error type and provide more specific messages
          if (error.message && error.message.includes("not registered")) {
            setMessage("This email is not registered. Please create an account first.");
            setShowRedirectToRegister(true);
          } else if (error.message && error.message.includes("Invalid credentials")) {
            setMessage("Incorrect password. Please try again.");
          } else if (error.message && error.message.includes("404")) {
            setMessage("Account not found. Redirecting to registration page...");
            setShowRedirectToRegister(true);
          } else {
            setMessage(error.message || "Authentication failed. Please try again later.");
          }
          result = { success: false };
        }
      }

      if (!result.success && !registrationSuccess && !showRedirectToRegister) {
        setMessage(result.error || "Authentication failed");
      }
    } catch (error) {
      setMessage(error.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setMessage("");
    setEmailError("");
    setRegistrationSuccess(false);
    setRedirectingToQuiz(false);
  };

  if (redirectingToQuiz) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-teal-800 mb-6">
            Redirecting to Quiz
          </h2>
          <div className="flex justify-center items-center py-10">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-teal-500 border-opacity-50"></div>
          </div>
          <p className="text-gray-600">Please wait while we prepare your quiz...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-teal-800 mb-6">
        {isRegistering ? "Create Account" : "Student Login"}
      </h2>
      
      {registrationSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-300 text-green-700 rounded-lg">
          <div className="flex items-center mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-semibold">Registration successful!</span>
          </div>
          <p>You'll be directed to the career quiz in a moment...</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {isRegistering && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full Name"
            className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            required
            disabled={registrationSuccess}
          />
        )}
        
        <div className="mb-4">
          <input
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder="Email Address (must be a Gmail account)"
            className={`w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 ${
              emailError ? 'border-red-500' : 'border-gray-300'
            }`}
            required
            pattern="[a-zA-Z0-9._%+-]+@gmail\.com$"
            title="Please enter a valid Gmail address (example@gmail.com)"
            disabled={registrationSuccess}
          />
          {emailError && (
            <p className="mt-1 text-sm text-red-600">{emailError}</p>
          )}
        </div>
        
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          required
          disabled={registrationSuccess}
        />

        {isRegistering && (
          <>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Your Grade
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(parseInt(e.target.value))}
              className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
              disabled={registrationSuccess}
            >
              <option value={10}>Grade 10</option>
              <option value={11}>Grade 11</option>
              <option value={12}>Grade 12</option>
            </select>
          </>
        )}

        <button
          type="submit"
          disabled={isLoading || registrationSuccess || emailError}
          className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-400"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing...
            </span>
          ) : isRegistering ? "Register & Take Quiz" : "Login"}
        </button>
      </form>
      
      {message && !registrationSuccess && <p className="mt-4 text-red-600">{message}</p>}
      
      {showRedirectToRegister && (
        <p className="mt-2 text-blue-600">
          Redirecting in {redirectCountdown} second{redirectCountdown !== 1 ? 's' : ''}...
        </p>
      )}
      
      {!registrationSuccess && !showRedirectToRegister && (
        <div className="mt-6 text-center text-sm">
          <button 
            onClick={toggleMode}
            className="text-teal-600 hover:text-teal-800 hover:underline"
          >
            {isRegistering 
              ? "Already have an account? Login here" 
              : "Don't have an account? Register now"}
          </button>
        </div>
      )}
    </div>
  );
};

export default Login;