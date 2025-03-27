const express = require('express');
const router = express.Router();
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { openai, debug } = require('./config/openai');

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

// 1. Interview Preparation Feature
router.post('/interview-prep', upload.single('file'), async (req, res) => {
  debug.log('Received interview prep request');

  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    debug.log('Processing file:', {
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype
    });

    // Parse PDF with minimal settings
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

    if (!pdfText || pdfText.length === 0) {
      throw new Error('Failed to extract text from PDF');
    }

    // Truncate text to reduce processing time
    const truncatedText = pdfText.slice(0, 1000);

    const prompt = `Based on this CV, create a personalised interview preparation guide focused on DevOps and infrastructure roles. Focus on:

1. Technical Questions (4):
   - Create questions based on the DevOps technologies in their CV: ${truncatedText.match(/\b(?:Docker|Kubernetes|AWS|CI/CD|Jenkins|Git|Terraform|Ansible|Linux|Shell|Infrastructure|DevOps|Cloud)\b/g)?.join(', ')}
   - Include both basic concepts and advanced scenarios
   - Focus on infrastructure, automation, and cloud technologies
   - Provide detailed example answers with practical examples

2. Experience Deep-Dive (4):
   - Create questions based on their specific DevOps projects and roles
   - Focus on: ${truncatedText.match(/(?<=• ).*$/gm)?.slice(0, 3).join(', ')}
   - Include system architecture and infrastructure design questions
   - Provide STAR method response templates

3. DevOps Scenarios (4):
   - Based on their role and experience level
   - Include infrastructure scaling and automation scenarios
   - Focus on CI/CD pipeline challenges
   - Provide structured response frameworks

4. Company Research Guide:
   - DevOps industry trends relevant to their experience
   - Salary range analysis: £[range] based on experience
   - Questions to ask about their DevOps practices

CV Content:
${truncatedText}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        { 
          role: "system", 
          content: "You are an expert DevOps interviewer and technical recruiter. Create specific, detailed interview questions and guidance based on the candidate's actual DevOps experience. Use British English and be direct and practical. Focus on infrastructure, automation, and cloud technologies." 
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    res.json({ interviewPrep: completion.choices[0].message.content });
  } catch (error) {
    debug.error('Error in interview prep:', error);
    res.status(500).json({ 
      error: 'Failed to generate interview preparation',
      details: error.message 
    });
  }
});

// 2. Industry-Specific Optimization
router.post('/industry-optimize', upload.single('file'), async (req, res) => {
  debug.log('Received industry optimization request');

  try {
    if (!req.file) {
      throw new Error('No file uploaded');
    }

    debug.log('Processing file:', {
      fileName: req.file.originalname,
      fileSize: req.file.size,
      fileType: req.file.mimetype
    });

    // Parse PDF with minimal settings
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

    if (!pdfText || pdfText.length === 0) {
      throw new Error('Failed to extract text from PDF');
    }

    // Truncate text to reduce processing time
    const truncatedText = pdfText.slice(0, 1000);

    const prompt = `Based on this CV, provide a comprehensive industry optimisation analysis. Include:

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
${truncatedText}`;

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

    res.json({ industryOptimization: completion.choices[0].message.content });
  } catch (error) {
    debug.error('Error in industry optimization:', error);
    res.status(500).json({ 
      error: 'Failed to generate industry optimization',
      details: error.message 
    });
  }
});

module.exports = router; 