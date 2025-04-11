import { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import chatbotIcon from "../assets/chatbot-icon.png";
import pinIcon from "../assets/pin-icon.png";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      text: "Hi! I’m CareerBot, your virtual assistant. What do you need assistance with today?",
      sender: "bot",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Utility function to convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]); // Extract base64 part
      reader.onerror = (error) => reject(error);
    });
  };

  // Utility function to transform numbered steps with ** into bullet points without **
  const transformStepsToBulletPoints = (text) => {
    // Split the response into lines
    const lines = text.split("\n");
    const transformedLines = lines.map((line) => {
      // Match lines that start with a number, followed by a step with ** (e.g., "1. **Step**")
      const stepMatch = line.match(/^\d+\.\s*\*\*(.*?)\*\*(.*)$/);
      if (stepMatch) {
        const stepText = stepMatch[1]; // Text between ** (e.g., "Carefully read all instructions")
        const restOfLine = stepMatch[2] || ""; // Any additional text after the step
        return `- ${stepText}${restOfLine}`; // Transform to bullet point (e.g., "- Carefully read all instructions")
      }
      return line; // Return unchanged if not a step
    });
    return transformedLines.join("\n");
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      text: input,
      sender: "user",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Check if the previous message contains a file (image)
      const lastMessageWithFile = messages
        .slice()
        .reverse()
        .find((msg) => msg.file && msg.sender === "user");

      let prompt = `You are a career guidance chatbot. The user has asked: "${input}". Provide helpful career advice for a 10-12th grade student, focusing on the specific question. Keep the response concise and professional. If the response includes steps, format them as numbered steps (e.g., "1. **Step**"). After providing the steps or advice, add a justification explaining why these steps are relevant to the user's query.`;

      let content = [{ text: prompt }];

      // If an image was uploaded recently, include it in the request
      if (lastMessageWithFile && lastMessageWithFile.fileRaw) {
        const base64Image = await fileToBase64(lastMessageWithFile.fileRaw);
        content.push({
          inlineData: {
            data: base64Image,
            mimeType: lastMessageWithFile.fileType,
          },
        });
        prompt += "\nThe user has uploaded an image (e.g., a form). Analyze the image and provide specific steps to complete or address the content in the image, if relevant to the question. Ensure the steps are tailored to the specific form or content in the image.";
      }

      const result = await model.generateContent(content);
      let rawResponse = result.response.text();

      // Transform the response to convert numbered steps with ** into bullet points without **
      const transformedResponse = transformStepsToBulletPoints(rawResponse);

      const botResponse = {
        text: transformedResponse,
        sender: "bot",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error("Error processing message:", error);
      setMessages((prev) => [
        ...prev,
        {
          text: "Sorry, an error occurred while processing the image or message. Please try again.",
          sender: "bot",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const fileMessage = {
        text: `Uploaded file: ${file.name}`,
        sender: "user",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        file: URL.createObjectURL(file), // For preview
        fileName: file.name,
        fileType: file.type,
        fileRaw: file, // Store the raw file object for base64 conversion
      };
      setMessages((prev) => [...prev, fileMessage]);
    }
  };

  const toggleChatBot = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Chatbot Icon */}
      <div
        className="fixed bottom-4 right-4 w-16 h-16 cursor-pointer z-50"
        onClick={toggleChatBot}
      >
        <img
          src={chatbotIcon}
          alt="Chatbot Icon"
          className="w-full h-full object-contain"
        />
      </div>

      {/* Chatbot Popup */}
      {isOpen && (
        <div
          className="fixed bottom-20 right-4 bg-white rounded-lg shadow-xl z-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-700"
          style={{ width: "400px", height: "600px" }}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-semibold text-teal-800 dark:text-teal-100">CareerBot</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div>
              <button
                onClick={() => setIsOpen(false)} // Close completely
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 mr-2"
              >
                ✕
              </button>
              <button
                onClick={toggleChatBot} // Minimize
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
              >
                _
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            className="overflow-y-auto p-4"
            style={{ height: "calc(600px - 128px - 72px)" }}
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex mb-4 ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs p-3 rounded-lg ${
                    message.sender === "user"
                      ? "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                  }`}
                >
                  {message.file ? (
                    <div>
                      {message.fileType.startsWith("image/") ? (
                        <img
                          src={message.file}
                          alt={message.fileName}
                          className="max-w-full h-auto rounded-lg mb-2"
                        />
                      ) : (
                        <a
                          href={message.file}
                          download={message.fileName}
                          className="text-blue-500 hover:underline"
                        >
                          {message.fileName}
                        </a>
                      )}
                      <p>{message.text}</p>
                    </div>
                  ) : (
                    <p>{message.text}</p>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400 block mt-1">
                    {message.timestamp}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="flex items-center p-4 border-t border-gray-200 dark:border-gray-700">
            <label htmlFor="file-upload" className="cursor-pointer mr-2">
              <img
                src={pinIcon}
                alt="Attach File"
                className="w-6 h-6"
              />
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type a message"
              className="flex-1 p-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
              disabled={isLoading}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;