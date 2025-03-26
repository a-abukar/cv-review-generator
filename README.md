# CV Review Generator

An AI-powered CV review and optimization tool that provides detailed feedback and suggestions for improvement.

## Features

- Detailed CV content and design review
- Review summary with actionable insights
- Rate-limited API access
- Modern, responsive UI
- Premium features (Interview Prep, Industry Optimization)

## Setup

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/cv-review-generator.git
cd cv-review-generator
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Create a `.env` file in the backend directory:
```env
OPENAI_API_KEY=your_api_key_here
PORT=3000
NODE_ENV=development
```

### Running Locally

1. Start the backend server:
```bash
cd backend
npm start
```

2. Open the frontend HTML file in your browser:
- Navigate to the `frontend` directory
- Open `index.html` in your web browser

## Deployment

The project is configured for deployment on Vercel. Make sure to:

1. Set up environment variables in your Vercel project settings
2. Configure the deployment to use the root directory
3. Ensure the OpenAI API key is properly set in production

## Rate Limiting

The application includes rate limiting to prevent abuse:
- 1 review summary request per IP address every 10 minutes
- Basic rate limiting for other API endpoints

## Security

- API key is securely stored in environment variables
- File uploads are restricted to PDFs
- Rate limiting prevents abuse
- Input validation and sanitization implemented

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 