const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const { openai, debug } = require('./config/openai');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: function (req, file, cb) {
    // Add timestamp to prevent filename conflicts
    const timestamp = Date.now();
    cb(null, `${timestamp}-${file.originalname}`);
  }
});

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

// Helper function to clean up file
async function cleanupFile(filePath) {
  try {
    if (filePath) {
      await fs.unlink(filePath);
      debug.log(`Cleaned up file: ${filePath}`);
    }
  } catch (error) {
    debug.error(`Error cleaning up file: ${filePath}`, error);
  }
}

// 1. Interview Preparation Feature
router.post('/interview-prep', upload.single('file'), async (req, res) => {
  debug.log('Received interview prep request');
  let filePath = null;

  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    filePath = req.file.path;
    debug.log('Processing file:', filePath);

    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const pdfText = pdfData.text;

    if (!pdfText || pdfText.length === 0) {
      throw new Error('Failed to extract text from PDF');
    }

    const prompt = `Based on this CV, create a personalized interview preparation guide. Focus on:

1. Technical Questions (10):
   - Create questions based on the technologies in their CV: ${pdfText.match(/\b(?:Python|Java|JavaScript|React|Node|AWS|Docker|Kubernetes|etc)\b/g)?.join(', ')}
   - Include both basic concepts and advanced scenarios
   - Provide detailed example answers with code snippets where relevant

2. Experience Deep-Dive (5):
   - Create questions based on their specific projects and roles
   - Focus on: ${pdfText.match(/(?<=• ).*$/gm)?.slice(0, 3).join(', ')}
   - Include system design and architecture questions
   - Provide STAR method response templates

3. Behavioral Scenarios (5):
   - Based on their role and experience level
   - Include conflict resolution and leadership scenarios
   - Provide structured response frameworks

4. Company Research Guide:
   - Industry trends relevant to their experience
   - Salary range analysis: £[range] based on experience
   - Questions to ask interviewers

CV Content:
${pdfText}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { 
          role: "system", 
          content: "You are an expert technical interviewer and career coach. Create specific, detailed interview questions and guidance based on the candidate's actual experience. Use British English and be direct and practical." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 2500
    });

    await cleanupFile(filePath);
    res.json({ interviewPrep: completion.choices[0].message.content });
  } catch (error) {
    debug.error('Error in interview prep:', error);
    await cleanupFile(filePath);
    res.status(500).json({ 
      error: 'Failed to generate interview preparation',
      details: error.message 
    });
  }
});

// 2. Industry-Specific Optimization
router.post('/industry-optimize', upload.single('file'), async (req, res) => {
  debug.log('Received industry optimization request');
  let filePath = null;

  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    filePath = req.file.path;
    debug.log('Processing file:', filePath);

    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const pdfText = pdfData.text;

    if (!pdfText || pdfText.length === 0) {
      throw new Error('Failed to extract text from PDF');
    }

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

    await cleanupFile(filePath);
    res.json({ industryOptimization: completion.choices[0].message.content });
  } catch (error) {
    debug.error('Error in industry optimization:', error);
    await cleanupFile(filePath);
    res.status(500).json({ 
      error: 'Failed to generate industry optimization',
      details: error.message 
    });
  }
});

module.exports = router; 