# CV Review Generator

An AI-powered CV review application that provides detailed feedback on your CV's content and design, along with premium features for interview preparation and industry optimization.

## 🌐 Live Demo
Visit the live application at: [https://cv-review-generator.vercel.app](https://cv-review-generator.vercel.app)

## 🚀 Features

### Free Features
- **Content Review**: Detailed analysis of your CV's content, including profile, experience, and skills sections
- **Design Review**: Expert feedback on layout, formatting, and visual presentation
- **Score & Summary**: Overall CV score with key strengths and areas for improvement
- **Action Points**: Specific, actionable recommendations for improvement

### Premium Features
- **Interview Preparation**: Personalized interview questions and guidance based on your CV
- **Industry Optimization**: Industry-specific insights and optimization recommendations
- **Salary Analysis**: Market rate analysis and negotiation strategies

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js, Express
- **AI**: OpenAI GPT-3.5 Turbo (GPT-4 available for local development)
- **PDF Processing**: pdf-parse, pdfjs-dist
- **Deployment**: Vercel

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/a-abukar/cv-review-generator.git
cd cv-review-generator
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
OPENAI_API_KEY=your_api_key_here
```

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:3000`

### Using GPT-4 (Local Development Only)
The deployed version uses GPT-3.5 Turbo for cost optimization. To use GPT-4 locally:

1. Update the model in `backend/server.js` and `backend/premium-routes.js`:
```javascript
model: "gpt-4-turbo-preview"  // Instead of "gpt-3.5-turbo-0125"
```

2. Note: GPT-4 provides higher quality responses but costs more per request.

## 📝 Usage

1. Upload your CV (PDF format only)
2. Wait for the AI to analyze your CV
3. Review the detailed feedback
4. Access premium features for additional insights

## ⚠️ Limitations

- Maximum file size: 5MB
- Supported format: PDF only
- Rate limiting: 5 requests per 15 minutes
- Premium features: 1 request per 10 minutes

## 🔒 Security

- File uploads are processed in memory (no disk storage)
- API keys are stored securely in environment variables
- Rate limiting implemented to prevent abuse
- CORS protection enabled

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for providing the GPT API
- The open-source community for various libraries used in this project 