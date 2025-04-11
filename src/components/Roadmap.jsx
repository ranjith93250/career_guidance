import { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

const Roadmap = ({ jobTitle, currentGrade }) => {
  const [roadmap, setRoadmap] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const generateRoadmap = async () => {
    setIsLoading(true);
    setError(null);
    setRoadmap([]); // Reset roadmap on new request

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

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg mt-8">
      <h3 className="text-xl font-semibold text-teal-800 mb-4">
        Roadmap to{" "}
        {jobTitle
          .replace(/^\d+\.\s*\*\*|\*\*/g, "") // Remove numbering and ** markers
          .replace(/:.*$/, "") // Remove trailing colon and anything after it
          .trim()}{" "}
        (Grades {currentGrade})
      </h3>
      <button
        onClick={generateRoadmap}
        disabled={isLoading}
        className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:bg-teal-400 mb-4"
      >
        {isLoading ? "Generating..." : "Generate Roadmap"}
      </button>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      {roadmap.length > 0 && (
        <ul className="list-disc pl-5 text-gray-700">
          {roadmap.map((step, index) => (
            <li key={index} className="mb-2">{step}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Roadmap;