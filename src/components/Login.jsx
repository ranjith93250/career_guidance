import { useState } from "react";

const Login = ({ setIsLoggedIn, setGrade }) => {
  const [name, setName] = useState("");
  const [selectedGrade, setSelectedGrade] = useState(10);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    // Simple in-memory validation (for demo purposes)
    if (name && [10, 11, 12].includes(selectedGrade) && password) {
      setIsLoggedIn(true);
      setGrade(selectedGrade);
      setMessage("");
    } else {
      setMessage("Please enter valid name, grade (10-12), and password.");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-teal-800 mb-6">Student Login</h2>
      <form onSubmit={handleLogin}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full Name"
          className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          required
        />

        <select
          value={selectedGrade}
          onChange={(e) => setSelectedGrade(parseInt(e.target.value))}
          className="w-full p-3 mb-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          required
        >
          <option value={10}>Grade 10</option>
          <option value={11}>Grade 11</option>
          <option value={12}>Grade 12</option>
        </select>

        <button
          type="submit"
          className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
        >
          Login
        </button>
      </form>
      {message && <p className="mt-4 text-red-600">{message}</p>}
    </div>
  );
};

export default Login;