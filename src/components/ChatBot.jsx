import { useState, useEffect, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import chatbotIcon from "../assets/chatbot-icon.png";
import pinIcon from "../assets/pin-icon.png";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      text: "Hey there! I'm CareerBot, your friendly guide. What's on your mind today? 😊",
      sender: "bot",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = (error) => reject(error);
    });
  };

  const transformStepsToBulletPoints = (text) => {
    const lines = text.split("\n");
    return lines
      .map((line) => {
        const stepMatch = line.match(/^\d+\.\s*\*\*(.*?)\*\*(.*)$/);
        return stepMatch ? `- ${stepMatch[1]}${stepMatch[2] || ""}` : line;
      })
      .join("\n");
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
      const lastMessageWithFile = messages
        .slice()
        .reverse()
        .find((msg) => msg.file && msg.sender === "user");

      let prompt = `You are a friendly career guidance chatbot for 10-12th grade students. The user asked: "${input}". Respond with a concise, accurate answer (1-2 sentences max) based on the latest data. For salary questions, provide a specific range in Indian Rupees (₹) using recent web data (e.g., ₹1.0 Lakhs to ₹15.0 Lakhs per year for pharmacologists in India as of 2025). Acknowledge the previous message if relevant, and only ask for clarification if the question is truly vague (e.g., 'What type of role?'). If no specific data is available, say 'I don't have exact data, but I can suggest exploring further!'`;

      let content = [{ text: prompt }];

      if (lastMessageWithFile && lastMessageWithFile.fileRaw) {
        const base64Image = await fileToBase64(lastMessageWithFile.fileRaw);
        content.push({
          inlineData: { data: base64Image, mimeType: lastMessageWithFile.fileType },
        });
        prompt += " The user uploaded an image; analyze it briefly if relevant and keep the response short.";
      }

      const result = await model.generateContent(content);
      let rawResponse = result.response.text();
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
          text: "Oops! Something went wrong. Let's try again! 😅",
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
        file: URL.createObjectURL(file),
        fileName: file.name,
        fileType: file.type,
        fileRaw: file,
      };
      setMessages((prev) => [...prev, fileMessage]);
    }
  };

  const toggleChatBot = () => {
    setIsOpen(!isOpen);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !isLoading && input.trim()) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-teal-600 text-white flex items-center justify-center cursor-pointer shadow-lg hover:bg-teal-700 transition-all transform hover:scale-105 z-50" onClick={toggleChatBot}>
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </div>

      {isOpen && (
        <div className="fixed bottom-24 right-6 bg-white rounded-xl shadow-2xl z-50 border border-gray-200 overflow-hidden transition-all duration-300" style={{ width: "350px", maxHeight: "600px" }}>
          <div className="bg-teal-600 text-white p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                <h3 className="text-lg font-semibold">CareerBot</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="overflow-y-auto p-4 bg-gray-50" style={{ height: "380px" }}>
            {messages.map((message, index) => (
              <div key={index} className={`flex mb-4 ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                {message.sender === "bot" && (
                  <div className="h-8 w-8 rounded-full bg-teal-600 text-white flex items-center justify-center mr-2 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                )}
                <div 
                  className={`max-w-[70%] p-3 rounded-xl shadow-sm ${
                    message.sender === "user" 
                      ? "bg-teal-600 text-white rounded-tr-none" 
                      : "bg-white text-gray-800 rounded-tl-none border border-gray-200"
                  }`}
                >
                  {message.file ? (
                    <div>
                      {message.fileType.startsWith("image/") ? (
                        <img src={message.file} alt={message.fileName} className="max-w-full h-auto rounded-lg mb-2" />
                      ) : (
                        <a href={message.file} download={message.fileName} className="text-blue-400 hover:underline">
                          {message.fileName}
                        </a>
                      )}
                      <p>{message.text}</p>
                    </div>
                  ) : (
                    <p className="whitespace-pre-line">{message.text}</p>
                  )}
                  <span className={`text-xs block mt-1 ${message.sender === "user" ? "text-teal-100" : "text-gray-500"}`}>
                    {message.timestamp}
                  </span>
                </div>
                {message.sender === "user" && (
                  <div className="h-8 w-8 rounded-full bg-teal-700 text-white flex items-center justify-center ml-2 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
            
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="h-8 w-8 rounded-full bg-teal-600 text-white flex items-center justify-center mr-2 flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <div className="max-w-[70%] p-3 rounded-xl shadow-sm bg-white text-gray-800 rounded-tl-none border border-gray-200">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-teal-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-gray-200 bg-white">
            <div className="flex items-center">
              <label className="p-2 rounded-full hover:bg-gray-100 cursor-pointer transition-colors mr-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                  accept="image/*,.pdf,.doc,.docx"
                />
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 p-2 border rounded-full focus:outline-none focus:border-teal-500 text-sm"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                className={`p-2 ml-1 rounded-full ${
                  input.trim() ? 'bg-teal-600 text-white' : 'bg-gray-200 text-gray-400'
                } transition-colors`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;