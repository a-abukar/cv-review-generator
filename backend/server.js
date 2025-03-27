const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { openai, debug } = require('./config/openai');
const premiumRoutes = require('./premium-routes');

// Load environment variables first
dotenv.config();

// Configure multer for memory storage with optimized settings
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed!'), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

const app = express();
const port = process.env.PORT || 3000;

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // limit each IP to 5 requests per windowMs
});

// Configure rate limiter - 1 request per 10 minutes per IP
const openAILimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 1, // limit each IP to 1 request per windowMs
  message: {
    error: 'Too many requests. Please wait 10 minutes before trying again.',
    nextAvailableTime: null // Will be set dynamically
  },
  keyGenerator: (req) => req.ip, // Use IP as identifier
  handler: (req, res) => {
    const timeLeft = req.rateLimit.resetTime - Date.now();
    const minutesLeft = Math.ceil(timeLeft / (60 * 1000));
    res.status(429).json({
      error: `Too many requests. Please wait ${minutesLeft} minutes before trying again.`,
      nextAvailableTime: req.rateLimit.resetTime
    });
  }
});

// Configure CORS
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:8000',
    'https://cv-review-generator.vercel.app'
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  debug.log('Incoming request:', {
    method: req.method,
    url: req.url,
    body: req.body
  });
  next();
});

// Apply rate limiting to review endpoint
app.use('/api/review', limiter);

// Import and use premium routes
app.use('/api/premium', premiumRoutes);

// Function to truncate text to a maximum length
function truncateText(text, maxLength = 4000) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// CV Review endpoint using file upload
app.post('/api/review', upload.single('file'), async (req, res) => {
  try {
    debug.log('Received request:', {
      hasFile: !!req.file,
      fileSize: req.file?.size,
      fileType: req.file?.mimetype
    });

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse PDF content from buffer with minimal settings
    const pdfData = await pdfParse(req.file.buffer, {
      max: 1, // Only parse first page
      pagerender: function(pageData) {
        return pageData.getTextContent()
          .then(function(textContent) {
            let lastY, text = '';
            for (let item of textContent.items) {
              if (lastY != item.transform[5] && text) {
                text += '\n';
              }
              text += item.str;
              lastY = item.transform[5];
            }
            return text;
          });
      }
    });
    
    const pdfText = pdfData.text;
    debug.log('PDF text extracted, length:', pdfText.length);

    if (!pdfText || pdfText.length === 0) {
      throw new Error('Failed to extract text from PDF');
    }

    // Truncate text to reduce processing time
    const truncatedText = truncateText(pdfText, 1000);

    const prompt = `Review this CV in simple, direct British English. Address the candidate directly and be specific about what needs changing.

### Content Review:
Hi [Person's Name], here's what needs work in your CV content:

1. Profile (currently [X] lines, needs to be 3-4):
   - Your current profile: "[quote exact profile]"
   - Here's what to change: [specific changes]

2. Experience Section:
   - Your [company name] role has [X] bullet points (you need exactly 12)
   - Your [other company] role has [X] points (needs 6-8)
   - These bullet points are too long: [quote each multi-line bullet]
   - Add these missing metrics: [specific metrics for each bullet]
   - Bold these tools: [list exact tools that need **bold**]

3. Skills:
   - Current format: [describe exactly how skills are shown]
   - Missing key skills: [list specific missing skills]
   - Change to bubble format like this: [skill] • [skill] • [skill]

4. Section Order:
   - Your current order: [list exact order]
   - Correct order: Personal info → Profile → Skills → Experience → Projects → Certifications → Education
   - Missing sections: [list any missing]

### Design Review:
Now, let's fix your CV's design:

1. Layout:
   - Font size: [list sections with small fonts]
   - Contrast: [mention specific low-contrast areas]
   - Skills format: Change from [current format] to bubbles
   - Spacing: Add [X]pt space between [specific sections]

2. Bullet Points:
   - Multi-line bullets to fix: [quote each one]
   - Current counts: [list exact counts per role]
   - Required: 12 for current role, 6-8 for others

3. Missing Design Elements:
   - Missing sections: [list each]
   - Design improvements needed: [specific changes]

Remember: Keep your bullet points to one line, use high contrast colours, and ensure your CV follows this exact structure.

CV Content:
${truncatedText}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { 
          role: "system", 
          content: "You are an expert CV reviewer. Provide specific, actionable feedback in British English. Focus on concrete changes and exact improvements needed." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const review = completion.choices[0].message.content;
    const sections = review.split(/(?=### Design Review:)/);
    
    res.json({
      contentReview: sections[0].replace('### Content Review:', '').trim(),
      designReview: sections[1]?.replace('### Design Review:', '').trim() || ''
    });

  } catch (error) {
    debug.error('Error processing review:', error);
    res.status(500).json({ 
      error: 'Failed to process the review',
      details: error.message 
    });
  }
});

// Error handling middleware must be after all routes
app.use((err, req, res, next) => {
  debug.error('Global error handler:', err);
  res.status(500).json({ 
    error: 'Something went wrong!',
    details: err.message 
  });
});

// Start the server only if not running on Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

// Export the Express API
module.exports = app;