const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const { openai, debug } = require('./config/openai');
const premiumRoutes = require('./premium-routes');

// Load environment variables first
dotenv.config();

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = path.resolve(require.resolve('pdfjs-dist/legacy/build/pdf.worker.js'));

// Configure multer for memory storage
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

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
fs.mkdir(uploadDir, { recursive: true })
  .then(() => debug.log('Uploads directory ready'))
  .catch(err => debug.error('Error creating uploads directory:', err));

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

// Middleware logger to log all incoming requests
app.use((req, res, next) => {
  debug.log('Incoming request:', {
    method: req.method,
    url: req.url,
    body: req.body
  });
  next();
});

// Apply rate limiter to OpenAI endpoints
app.use('/api/chatgpt/review-summary', openAILimiter);

// Add timeout middleware
const timeout = (seconds) => {
  const ms = seconds * 1000;
  return (req, res, next) => {
    res.setTimeout(ms, () => {
      res.status(504).json({
        error: 'Request timeout - The operation took too long to complete'
      });
    });
    next();
  };
};

// Apply timeout middleware to review endpoints
app.use('/api/review', timeout(55)); // 55 seconds timeout
app.use('/api/chatgpt/review-summary', timeout(55));

debug.log('Middleware configured');

// Function to truncate text to a maximum length
function truncateText(text, maxLength = 4000) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Function to extract visual information from PDF (currently not used, but available)
async function extractVisualInfo(pdfDoc) {
  try {
    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();
    
    const fonts = new Set();
    textContent.items.forEach(item => {
      if (item.fontName) fonts.add(item.fontName);
    });

    const layout = {
      width: viewport.width,
      height: viewport.height,
      textItems: textContent.items.slice(0, 20).map(item => ({
        text: item.str.substring(0, 50),
        x: item.transform[4],
        y: item.transform[5],
        fontName: item.fontName
      }))
    };

    return {
      fonts: Array.from(fonts).slice(0, 5),
      layout: layout
    };
  } catch (error) {
    debug.error('Error extracting visual information:', error);
    return {
      fonts: [],
      layout: null
    };
  }
}

// CV Review endpoint using file upload
app.post('/api/review', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    debug.log('File received in memory, size:', req.file.size);

    // Set a longer timeout for the response
    res.setTimeout(55000); // 55 seconds

    // Parse PDF content from buffer
    const pdfData = await pdfParse(req.file.buffer);
    const pdfText = pdfData.text;
    debug.log('PDF text extracted, length:', pdfText.length);

    // Extract visual information
    let visualInfo = {};
    try {
      const pdfDoc = await pdfjsLib.getDocument({ data: req.file.buffer }).promise;
      visualInfo = await extractVisualInfo(pdfDoc);
    } catch (error) {
      debug.error('Error extracting visual information:', error);
    }

    const truncatedText = truncateText(pdfText);
    const prompt = `Review this CV in simple, direct British English. Address the candidate directly and be specific about what needs changing.

### Content Review:
Hi Shurayeem, here's what needs work in your CV content:

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
${pdfText}`;

    const systemMessage = "You are a friendly but direct British CV expert. Write in simple, clear British English. Address the candidate by name. Be extremely specific about what needs changing and where. No vague suggestions - point to exact content and give clear fixes.";

    debug.log('Sending prompt to OpenAI:', { prompt: prompt.substring(0, 200) + '...' });

    // Add timeout promise
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Operation timed out')), 54000)
    );

    // Race between the OpenAI call and timeout
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
      }),
      timeoutPromise
    ]);

    debug.log('Received response from OpenAI');
    const openAiResponse = completion.choices[0].message.content;
    debug.log('Raw OpenAI response:', openAiResponse.substring(0, 200) + '...');

    // New approach to split reviews
    function extractReviews(text) {
        // Initialize default values
        let contentReview = '';
        let designReview = '';
        
        try {
            // Split the entire response into sections
            const sections = text.split(/(?=### (?:Content|Design) Review:)/g);
            
            // Process each section
            sections.forEach(section => {
                if (section.trim().startsWith('### Content Review:')) {
                    contentReview = section
                        .replace('### Content Review:', '')
                        .split('### Design Review:')[0]  // Remove any design review part
                        .trim();
                }
                else if (section.trim().startsWith('### Design Review:')) {
                    designReview = section
                        .replace('### Design Review:', '')
                        .trim();
                }
            });

            // Additional cleanup
            contentReview = contentReview
                .replace(/Design Review/g, '')  // Remove any remaining "Design Review" text
                .replace(/^\s*[\d.]+\s*Profile:?/m, '')  // Remove profile header
                .replace(/^\s*[\d.]+\s*Layout[^:]*:?/m, '')  // Remove layout header
                .trim();

            designReview = designReview
                .replace(/^\s*[\d.]+\s*Layout[^:]*:?/m, '')  // Remove layout header
                .trim();

            return { contentReview, designReview };
        } catch (error) {
            debug.error('Error splitting reviews:', error);
            return {
                contentReview: text.split('### Design Review:')[0].replace('### Content Review:', '').trim(),
                designReview: text.split('### Design Review:')[1]?.trim() || ''
            };
        }
    }

    // Extract the reviews
    const { contentReview, designReview } = extractReviews(openAiResponse);

    debug.log('Split review sections:', {
        contentReview: contentReview.substring(0, 100) + '...',
        designReview: designReview.substring(0, 100) + '...'
    });

    // Clean up the uploaded file
    try {
      await fs.unlink(req.file.path);
      debug.log('Cleaned up uploaded file');
    } catch (error) {
      debug.error('Error cleaning up file:', error);
    }

    res.json({ contentReview, designReview });
    debug.log('Review response sent to client');
  } catch (error) {
    debug.error('Error processing review:', error);
    if (error.message === 'Operation timed out') {
      res.status(504).json({ 
        error: 'The operation took too long to complete. Please try again.' 
      });
    } else {
      res.status(500).json({ 
        error: error.message || 'An error occurred while processing the review' 
      });
    }
  }
});

// Premium feature endpoints
app.post('/api/premium/interview-prep', upload.single('file'), async (req, res) => {
  debug.log('Received interview prep request');

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const dataBuffer = await fs.readFile(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    const pdfText = pdfData.text;

    const prompt = `Based on this CV, generate a comprehensive interview preparation guide. Include:

1. Technical Questions (10 questions):
   - Focus on the specific technologies mentioned in the CV
   - Include both basic and advanced questions
   - Provide detailed example answers

2. Experience-Based Questions (5 scenarios):
   - Create questions based on their actual work experience
   - Include challenging situations they might have faced
   - Provide guidance on how to structure responses using the STAR method

3. Project Deep-Dives (3 questions):
   - Questions about the specific projects mentioned in their CV
   - Technical architecture decisions
   - Challenge handling and problem-solving

4. Salary Negotiation:
   - Market rate analysis for their role and experience level
   - Specific talking points based on their achievements
   - Negotiation strategies

CV Content:
${pdfText}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { 
          role: "system", 
          content: "You are an expert technical interviewer and career coach. Provide detailed, specific interview preparation advice based on the candidate's actual experience." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    // Clean up file
    await fs.unlink(req.file.path);

    res.json({ interviewPrep: completion.choices[0].message.content });
  } catch (error) {
    debug.error('Error generating interview prep:', error);
    if (req.file?.path) await fs.unlink(req.file.path);
    res.status(500).json({ error: 'Failed to generate interview preparation' });
  }
});

app.post('/api/premium/industry-optimize', upload.single('file'), async (req, res) => {
  debug.log('Received industry optimization request');

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const dataBuffer = await fs.readFile(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    const pdfText = pdfData.text;

    const prompt = `Based on this CV, provide a comprehensive industry optimization analysis. Include:

1. Skills Gap Analysis:
   - Compare current skills with industry demands
   - Identify missing critical skills
   - Suggest specific certifications or training

2. Industry Insights:
   - Current market trends in their field
   - Growing technologies and skills
   - Industry-specific best practices

3. CV Optimization:
   - Industry-specific keyword recommendations
   - ATS optimization suggestions
   - Format and content adjustments for the industry

4. Competitive Analysis:
   - Position in the current market
   - Unique selling points
   - Areas for differentiation

CV Content:
${pdfText}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { 
          role: "system", 
          content: "You are an expert career advisor with deep knowledge of industry trends and requirements. Provide detailed, actionable optimization advice based on the candidate's CV." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    // Clean up file
    await fs.unlink(req.file.path);

    res.json({ industryOptimization: completion.choices[0].message.content });
  } catch (error) {
    debug.error('Error generating industry optimization:', error);
    if (req.file?.path) await fs.unlink(req.file.path);
    res.status(500).json({ error: 'Failed to generate industry optimization' });
  }
});

// Review Summary endpoint
app.post('/api/chatgpt/review-summary', async (req, res) => {
  try {
    const { contentReview, designReview } = req.body;
    
    if (!contentReview || !designReview) {
      return res.status(400).json({ error: 'Missing review content' });
    }

    debug.log('Generating review summary for:', {
      contentLength: contentReview?.length,
      designLength: designReview?.length
    });

    // Clean and prepare the reviews
    const cleanContent = contentReview.replace(/\n{3,}/g, '\n\n').trim();
    const cleanDesign = designReview.replace(/\n{3,}/g, '\n\n').trim();

    // Prepare the prompt for ChatGPT
    const prompt = `
      Based on the CV review below, create a concise summary with scores and action points.
      Return a JSON object with exactly these fields:
      - score (number 0-100)
      - strengths (array of 3 strings)
      - improvements (array of 3 strings)
      - actionPoints (array of 3 objects with title and description)

      Content Review:
      ${cleanContent}

      Design Review:
      ${cleanDesign}
    `;

    debug.log('Sending prompt to OpenAI');
    
    // Call ChatGPT API
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a CV review analyzer. ONLY return a valid JSON object — no backticks, no explanations, no markdown. The JSON must contain: score (0-100), strengths (3 items), improvements (3 items), and actionPoints (3 items with title and description)."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    debug.log('Received response from OpenAI');

    if (!completion.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI');
    }

    const rawResponse = completion.choices[0].message.content.trim();
    debug.log('Raw OpenAI response:', rawResponse);

    try {
      // Extract JSON from the response
      let cleanResponse = rawResponse;
      
      // First, try to find JSON within markdown code blocks
      const codeBlockMatch = rawResponse.match(/```(?:json)?\n([\s\S]*?)\n```/);
      if (codeBlockMatch) {
        cleanResponse = codeBlockMatch[1];
      } else {
        // If no code blocks, try to find JSON directly
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanResponse = jsonMatch[0];
        }
      }
      
      cleanResponse = cleanResponse.trim();
      debug.log('Cleaned response:', cleanResponse);

      // Parse and validate the response
      const jsonResponse = JSON.parse(cleanResponse);
      
      // Validate structure and types
      if (typeof jsonResponse.score !== 'number' || 
          !Array.isArray(jsonResponse.strengths) || 
          !Array.isArray(jsonResponse.improvements) || 
          !Array.isArray(jsonResponse.actionPoints)) {
        throw new Error('Invalid JSON structure');
      }

      // Ensure arrays have exactly 3 items and are properly formatted
      jsonResponse.strengths = jsonResponse.strengths.slice(0, 3).map(s => String(s).trim());
      jsonResponse.improvements = jsonResponse.improvements.slice(0, 3).map(s => String(s).trim());
      jsonResponse.actionPoints = jsonResponse.actionPoints.slice(0, 3).map(point => ({
        title: String(point.title || '').trim(),
        description: String(point.description || '').trim()
      }));
      
      // Ensure score is between 0 and 100
      jsonResponse.score = Math.min(Math.max(Math.round(jsonResponse.score), 0), 100);
      
      debug.log('Processed response:', jsonResponse);
      res.json(jsonResponse);
    } catch (parseError) {
      debug.error('Error parsing OpenAI response:', parseError);
      debug.error('Raw response that failed to parse:', rawResponse);
      res.status(500).json({ error: 'Failed to parse review summary' });
    }
  } catch (error) {
    debug.error('Error in review summary generation:', error);
    res.status(500).json({ error: 'Failed to generate review summary' });
  }
});

// Error handling middleware must be after all routes
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
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