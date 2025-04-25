# Career Guidance Application

## Overview
The Career Guidance Application is an interactive web platform designed to help students explore career options based on their interests, skills, and academic preferences. This tool uses AI-driven recommendations to suggest suitable career paths, provide detailed information about various professions, and offer educational roadmaps tailored to users' current grades levels.

## Features

### User Authentication & Profiles
- Account creation and login functionality
- Grade-level selection (10th, 11th, or 12th grade)
- Personal profile management
- Quiz history tracking

### Career Assessment
- Interactive quiz to gauge students' interests and aptitudes
- Customized questions based on grade level
- AI-powered career suggestions based on quiz responses

### Career Exploration
- Detailed job cards for each recommended career
- "Learn More" option that provides:
  - Key responsibilities
  - Required skills and work environment
  - Job demand insights
  - Salary range information
  - Qualification requirements
- Educational roadmaps showing steps from current grade to career

### Search & Filtering
- Career search functionality with AI-generated results
- Filtering options for salary, work environment, education level, and work-life balance
- Career analytics dashboard for broader exploration

### Interactive Support
- AI chatbot for answering career-related questions
- Retake quiz option for updated recommendations

## Technology Stack
- **Frontend**: React.js with Vite for fast development
- **Styling**: Tailwind CSS for responsive design
- **AI Integration**: Google's Generative AI (Gemini 1.5 Flash) for career recommendations
- **State Management**: React Context API for user data
- **Storage**: Local storage for offline functionality with server sync capabilities

## Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn package manager
- Python 3.8+ (for backend)
- Google Generative AI API key

### Simple Setup Instructions

1. **Clone the repository and navigate to the project folder**

2. **Install JavaScript dependencies**
   ```bash
   npm install
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create environment variables**
   Create a `.env` file in the root directory:
   ```
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

## Running the Application

1. **Start the frontend development server**
   ```bash
   npm run dev
   ```

2. **Access the application**
   Open your browser and navigate to `http://localhost:5173`

## Troubleshooting

- **Error with "@" symbol in requirements.txt**: Make sure you're using npm for JavaScript packages and pip for Python packages.
- **Missing dependencies**: Run `npm install` for frontend and `pip install -r requirements.txt` for backend.
- **API key issues**: Ensure your .env file contains a valid Google Gemini API key.

## Usage Guide

1. **Create an account or log in** if you already have one
2. **Select your grade level** (10th, 11th, or 12th)
3. **Complete the assessment quiz** to receive personalized career suggestions
4. **Explore recommended careers** by clicking on job cards
5. **View detailed information** about each career using the "Learn More" button
6. **See educational roadmaps** by selecting a specific career
7. **Search for additional careers** using the search bar and apply filters as needed
8. **Ask career-related questions** to the chatbot for additional guidance
9. **Retake the quiz** anytime to get updated recommendations

## Project Structure

- `src/`: Source code
  - `components/`: UI components (JobCard, Quiz, ChatBot, etc.)
  - `contexts/`: Context providers for state management
  - `services/`: API and utility services
- `public/`: Static assets

## Future Enhancements
- Integration with college databases for educational pathway recommendations
- Career aptitude tests with standardized assessments
- Virtual mentorship connections
- Internship and job opportunity listings

## License
[Your License] - See LICENSE file for details   420...
