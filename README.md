# AI Dental Receptionist Chatbot

An intelligent chatbot powered by Google Gemini API that serves as a virtual dental receptionist, helping patients with appointments, inquiries, and general dental information.

## Features

- 24/7 automated patient assistance
- Intelligent responses powered by Google Gemini AI
- Appointment scheduling and management
- Common dental questions and FAQs
- Patient information collection
- Responsive, modern UI

## Tech Stack

**Frontend:**
- JavaScript
- Tailwind CSS

**Backend:**
- Node.js
- Express.js

**Database:**
- Supabase

**AI:**
- Google Gemini API

**Deployment:**
- Render.com

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v14 or higher)
- npm or yarn
- A Supabase account
- A Google Gemini API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/dental-chatbot.git
cd dental-chatbot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
PORT=3000
```

4. Set up your Supabase database with the necessary tables for storing chat history and patient information.

## Running Locally

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Deployment

This application is configured for deployment on Render.com:

1. Push your code to GitHub
2. Connect your repository to Render
3. Add environment variables in Render dashboard
4. Deploy

## Usage

Users can interact with the chatbot to:
- Schedule dental appointments
- Ask questions about dental procedures
- Get information about office hours
- Request emergency dental care guidance
- Update or cancel existing appointments

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Your Google Gemini API key |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Your Supabase anonymous key |
| `PORT` | Server port (default: 3000) |


## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.


## Support

For questions or issues, please open an issue in the GitHub repository.

## Acknowledgments

- Google Gemini AI for powering the conversational capabilities
- Supabase for backend infrastructure
- Render.com for hosting
