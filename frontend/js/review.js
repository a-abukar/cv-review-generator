console.log('review.js loaded');
document.addEventListener('DOMContentLoaded', () => {
  const uploadedFileNameElement = document.getElementById('uploadedFileName');
  const fileName = localStorage.getItem('uploadedFileName') || 'Unknown File';
  uploadedFileNameElement.textContent = 'File: ' + fileName;

  const backBtn = document.getElementById('backBtn');
  backBtn.addEventListener('click', () => {
    window.location.href = 'index.html';
  });

  // Display loading messages while fetching the review
  const contentReviewElement = document.getElementById('contentReview');
  const designReviewElement = document.getElementById('designReview');
    contentReviewElement.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div><p>Generating content review...</p></div>';
    designReviewElement.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div><p>Generating design review...</p></div>';
  
    // Load and display the PDF
    const pdfViewer = document.getElementById('pdfViewer');
    const pdfLoading = document.getElementById('pdfLoading');
    const pdfContainer = document.getElementById('pdfContainer');
    const base64String = localStorage.getItem('uploadedFile');
    
    if (base64String) {
      console.log('Found uploaded file in localStorage, length:', base64String.length);
      // Convert base64 to blob
      const base64Data = base64String.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
        const slice = byteCharacters.slice(offset, offset + 1024);
        const byteNumbers = new Array(slice.length);
        
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      const blob = new Blob(byteArrays, { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Clear loading message and show PDF
      pdfLoading.style.display = 'none';
      pdfContainer.src = url;

      // Clean up URL object when the page is unloaded
      window.addEventListener('unload', () => {
        URL.revokeObjectURL(url);
      });
    } else {
      console.error('No uploaded file found in localStorage!');
      pdfLoading.innerHTML = '<div class="error-message">No PDF file found. Please upload your CV again.</div>';
    }
  
    // Initialize markdown-it
    const md = window.markdownit({
      html: true,
      breaks: true,
      linkify: true
    });
  
    // Function to render markdown content
    function renderMarkdown(content) {
      return md.render(content);
    }
  
    // Call the backend API to get the CV review
  getCVReview(fileName)
    .then(result => {
        console.log('Raw response from backend:', result);
        
        if (!result) {
          throw new Error('No response received from backend');
        }
  
        if (result.error) {
          throw new Error(result.error);
        }
  
        if (result.contentReview && result.designReview) {
          console.log('Received separate review sections');
          contentReviewElement.innerHTML = renderMarkdown(result.contentReview);
          designReviewElement.innerHTML = renderMarkdown(result.designReview);
        } else if (result.review) {
          console.log('Received single review field, splitting into sections...');
          const sections = result.review.split(/(?=### Design Review:)/);
          if (sections.length >= 2) {
            const contentSection = sections[0].replace('### Content Review:', '').trim();
            const designSection = sections[1].replace('### Design Review:', '').trim();
            
            // Clean up any duplicate headers
            const cleanContent = contentSection.replace(/### Design Review:.*$/s, '').trim();
            const cleanDesign = designSection.trim();
            
            contentReviewElement.innerHTML = renderMarkdown(cleanContent);
            designReviewElement.innerHTML = renderMarkdown(cleanDesign);
          } else {
            console.error('Could not split review into sections:', result.review);
            throw new Error('Could not split review into sections');
          }
        } else {
          console.error('Invalid response format:', result);
          throw new Error('Invalid review format received');
        }
    })
    .catch(error => {
        console.error('Error in review processing:', error);
        const errorMessage = error.message || 'An error occurred while generating the review.';
        contentReviewElement.innerHTML = `<div class="error-message">Error: ${errorMessage}</div>`;
        designReviewElement.innerHTML = `<div class="error-message">Error: ${errorMessage}</div>`;
      });
  
    // Function to call our backend API to generate a CV review
    async function getCVReview(fileName) {
      try {
        // Get the base64 string from localStorage
        const base64String = localStorage.getItem('uploadedFile');
        if (!base64String) {
          throw new Error('No file found in localStorage');
        }
        console.log('getCVReview: Found file in localStorage, length:', base64String.length);
  
        // Convert base64 to blob
        const base64Data = base64String.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteArrays = [];
        
        for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
          const slice = byteCharacters.slice(offset, offset + 1024);
          const byteNumbers = new Array(slice.length);
          
          for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
          }
          
          const byteArray = new Uint8Array(byteNumbers);
          byteArrays.push(byteArray);
        }
        
        const blob = new Blob(byteArrays, { type: 'application/pdf' });
        const file = new File([blob], fileName, { type: 'application/pdf' });
  
        console.log('Sending file to backend:', {
          fileName,
          fileSize: file.size,
          fileType: file.type
        });
  
        // Create FormData and append the file
        const formData = new FormData();
        formData.append('file', file);
  
        const response = await fetch('http://localhost:3000/api/review', {
          method: 'POST',
          body: formData // Don't set Content-Type header, let browser set it with boundary
        });
  
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to generate review');
        }
  
        console.log('Received response from backend:', result);
        return result;
      } catch (error) {
        console.error('Error in getCVReview:', error);
        throw error;
      }
    }
  
    // Add event listeners for premium feature buttons
    const interviewPrepBtn = document.getElementById('interviewPrepBtn');
    const industryOptimizeBtn = document.getElementById('industryOptimizeBtn');
  
    async function convertBase64ToFile(base64String, fileName) {
      // Convert base64 to blob
      const base64Data = base64String.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
        const slice = byteCharacters.slice(offset, offset + 1024);
        const byteNumbers = new Array(slice.length);
        
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      const blob = new Blob(byteArrays, { type: 'application/pdf' });
      return new File([blob], fileName, { type: 'application/pdf' });
    }
  
    interviewPrepBtn.addEventListener('click', async () => {
      try {
        const fileName = localStorage.getItem('uploadedFileName');
        const base64String = localStorage.getItem('uploadedFile');
        
        if (!base64String || !fileName) {
          throw new Error('No file found in localStorage');
        }
  
        // Show loading state
        interviewPrepBtn.disabled = true;
        interviewPrepBtn.innerHTML = '<div class="loading-spinner"></div> Generating...';
  
        // Convert base64 to File object
        const file = await convertBase64ToFile(base64String, fileName);
  
        // Create FormData and append the file
        const formData = new FormData();
        formData.append('file', file);
  
        const response = await fetch('http://localhost:3000/api/premium/interview-prep', {
          method: 'POST',
          body: formData
        });
  
        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to generate interview preparation');
        }
  
        // Create a new section for interview prep
        const reviewContainer = document.querySelector('.review-container');
        const interviewPrepSection = document.createElement('div');
        interviewPrepSection.className = 'review-section';
        interviewPrepSection.innerHTML = `
          <h2>Interview Preparation</h2>
          <div class="review-content">
            ${renderMarkdown(result.interviewPrep)}
          </div>
        `;
        
        // Insert the new section after the design review
        const designReview = document.querySelector('.review-section:nth-child(2)');
        designReview.after(interviewPrepSection);
  
      } catch (error) {
        console.error('Error generating interview prep:', error);
        alert('Failed to generate interview preparation. Please try again.');
      } finally {
        // Reset button state
        interviewPrepBtn.disabled = false;
        interviewPrepBtn.innerHTML = `
          <svg class="icon" viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
          </svg>
          Get Interview Prep
        `;
      }
    });
  
    industryOptimizeBtn.addEventListener('click', async () => {
      try {
        const fileName = localStorage.getItem('uploadedFileName');
        const base64String = localStorage.getItem('uploadedFile');
        
        if (!base64String || !fileName) {
          throw new Error('No file found in localStorage');
        }
  
        // Show loading state
        industryOptimizeBtn.disabled = true;
        industryOptimizeBtn.innerHTML = '<div class="loading-spinner"></div> Optimizing...';
  
        // Convert base64 to File object
        const file = await convertBase64ToFile(base64String, fileName);
  
        // Create FormData and append the file
        const formData = new FormData();
        formData.append('file', file);
  
        const response = await fetch('http://localhost:3000/api/premium/industry-optimize', {
        method: 'POST',
          body: formData
        });
  
        const result = await response.json();

      if (!response.ok) {
          throw new Error(result.error || 'Failed to generate industry optimization');
        }
  
        // Create a new section for industry optimization
        const reviewContainer = document.querySelector('.review-container');
        const industryOptSection = document.createElement('div');
        industryOptSection.className = 'review-section';
        industryOptSection.innerHTML = `
          <h2>Industry Optimization</h2>
          <div class="review-content">
            ${renderMarkdown(result.industryOptimization)}
          </div>
        `;
        
        // Insert the new section after the interview prep section or design review
        const interviewPrepSection = document.querySelector('.review-section:nth-child(3)');
        if (interviewPrepSection) {
          interviewPrepSection.after(industryOptSection);
        } else {
          const designReview = document.querySelector('.review-section:nth-child(2)');
          designReview.after(industryOptSection);
        }
  
      } catch (error) {
        console.error('Error generating industry optimization:', error);
        alert('Failed to generate industry optimization. Please try again.');
      } finally {
        // Reset button state
        industryOptimizeBtn.disabled = false;
        industryOptimizeBtn.innerHTML = `
          <svg class="icon" viewBox="0 0 24 24" width="24" height="24">
            <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1.99 6H7V7h10.01v2zm0 4H7v-2h10.01v2zm-3 4H7v-2h7.01v2z"/>
          </svg>
          Optimize for Industry
        `;
      }
    });

    // Review Summary Feature
    const reviewSummaryBtn = document.getElementById('reviewSummaryBtn');
    const reviewSummarySection = document.getElementById('reviewSummarySection');

    // Helper function to check if enough time has passed since last request
    function canMakeRequest() {
      const nextAvailableTime = localStorage.getItem('nextReviewSummaryTime');
      if (!nextAvailableTime) return true;
      
      const timeLeft = parseInt(nextAvailableTime) - Date.now();
      return timeLeft <= 0;
    }

    // Helper function to format time remaining
    function formatTimeRemaining(timeLeft) {
      const minutes = Math.ceil(timeLeft / (60 * 1000));
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }

    async function generateReviewSummary() {
      // Check if we can make a request
      if (!canMakeRequest()) {
        const nextAvailableTime = parseInt(localStorage.getItem('nextReviewSummaryTime'));
        const timeLeft = nextAvailableTime - Date.now();
        throw new Error(`Please wait ${formatTimeRemaining(timeLeft)} before generating another review summary.`);
      }

      // Get the raw text content
      const contentReview = document.getElementById('contentReview');
      const designReview = document.getElementById('designReview');
      
      if (!contentReview || !designReview) {
        throw new Error('Review sections not found');
      }
      
      // Clean up the text by removing excessive newlines and whitespace
      const cleanContent = contentReview.innerText.replace(/\n{3,}/g, '\n\n').trim();
      const cleanDesign = designReview.innerText.replace(/\n{3,}/g, '\n\n').trim();
      
      try {
        console.log('Sending review summary request with:', {
          contentLength: cleanContent.length,
          designLength: cleanDesign.length
        });

        // Call ChatGPT API to analyze the review and generate summary
        const response = await fetch('http://localhost:3000/api/chatgpt/review-summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contentReview: cleanContent,
            designReview: cleanDesign
          })
        });

        const result = await response.json();
        
        if (!response.ok) {
          // Handle rate limiting response
          if (response.status === 429 && result.nextAvailableTime) {
            localStorage.setItem('nextReviewSummaryTime', result.nextAvailableTime);
            throw new Error(result.error);
          }
          throw new Error(result.error || 'Failed to generate review summary');
        }

        // Clear the next available time if request was successful
        localStorage.removeItem('nextReviewSummaryTime');
        
        console.log('Received review summary result:', result);
        
        if (!result || typeof result.score !== 'number' || !Array.isArray(result.strengths) || !Array.isArray(result.improvements) || !Array.isArray(result.actionPoints)) {
          throw new Error('Invalid response format from server');
        }

        // Update UI with the AI-generated summary
        updateReviewSummary(result);

      } catch (error) {
        console.error('Error generating review summary:', error);
        const summaryContent = document.querySelector('.summary-content');
        if (summaryContent) {
          summaryContent.innerHTML = `
            <div class="error-message">
              ${error.message}
            </div>
          `;
        }
        throw error;
      }
    }

    // Update the click handler to show remaining time in the button
    reviewSummaryBtn.addEventListener('click', () => {
      console.log('Review Summary button clicked');
      
      // Get the review summary section
      const reviewSummarySection = document.getElementById('reviewSummarySection');
      if (!reviewSummarySection) {
        console.error('Review summary section not found');
        return;
      }
      
      // Show the section
      reviewSummarySection.style.display = 'block';
      
      // Get the summary content element
      const summaryContent = document.querySelector('.summary-content');
      if (!summaryContent) {
        console.error('Summary content element not found');
        return;
      }
      
      // Check if we can make a request
      if (!canMakeRequest()) {
        const nextAvailableTime = parseInt(localStorage.getItem('nextReviewSummaryTime'));
        const timeLeft = nextAvailableTime - Date.now();
        summaryContent.innerHTML = `
          <div class="error-message">
            Please wait ${formatTimeRemaining(timeLeft)} before generating another review summary.
          </div>
        `;
        return;
      }
      
      // Show loading state
      summaryContent.innerHTML = `
        <div class="loading-container">
          <div class="loading-spinner"></div>
          <p>Analyzing your CV review...</p>
        </div>
      `;
      
      // Generate the summary
      generateReviewSummary().catch(error => {
        console.error('Error in review summary click handler:', error);
        if (summaryContent) {
          summaryContent.innerHTML = `
            <div class="error-message">
              ${error.message}
            </div>
          `;
        }
      });
    });

    function updateReviewSummary(summary) {
      // Get the summary section and ensure it's visible
      const reviewSummarySection = document.getElementById('reviewSummarySection');
      if (!reviewSummarySection) {
        throw new Error('Review summary section not found');
      }
      reviewSummarySection.style.display = 'block';

      // Initialize the summary content structure
      const summaryContent = document.querySelector('.summary-content');
      if (!summaryContent) {
        throw new Error('Summary content element not found');
      }

      // Create the initial structure
      summaryContent.innerHTML = `
        <div class="summary-header">
          <div class="score-circle">
            <span class="score-value">0</span>
            <div class="score-label">Overall Score</div>
          </div>
        </div>
        
        <div class="summary-overview">
          <div class="insights-grid">
            <div class="insight-card">
              <h4>Key Strengths</h4>
              <ul id="strengthsList"></ul>
            </div>
            <div class="insight-card">
              <h4>Areas for Improvement</h4>
              <ul id="improvementsList"></ul>
            </div>
          </div>
          
          <div class="action-points">
            <h3>Action Points</h3>
            <div id="actionPointsList" class="action-points-list"></div>
          </div>
        </div>
      `;

      // Now that the structure is initialized, update each element
      const scoreValue = document.querySelector('.score-value');
      if (!scoreValue) {
        throw new Error('Score value element not found after initialization');
      }
      animateValue(scoreValue, 0, summary.score, 1500);
      
      // Update strengths
      const strengthsList = document.getElementById('strengthsList');
      if (!strengthsList) {
        throw new Error('Strengths list element not found');
      }
      strengthsList.innerHTML = summary.strengths
        .map(strength => `<li>${strength}</li>`)
        .join('');
      
      // Update improvements
      const improvementsList = document.getElementById('improvementsList');
      if (!improvementsList) {
        throw new Error('Improvements list element not found');
      }
      improvementsList.innerHTML = summary.improvements
        .map(improvement => `<li>${improvement}</li>`)
        .join('');
      
      // Update action points
      const actionPointsList = document.getElementById('actionPointsList');
      if (!actionPointsList) {
        throw new Error('Action points list element not found');
      }
      actionPointsList.innerHTML = summary.actionPoints
        .map((point, index) => `
          <div class="action-point">
            <div class="action-number">${index + 1}</div>
            <div class="action-content">
              <div class="action-title">${point.title}</div>
              <div class="action-description">${point.description}</div>
            </div>
          </div>
        `)
        .join('');
    }

    function animateValue(element, start, end, duration) {
      let startTimestamp = null;
      const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        element.textContent = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
          window.requestAnimationFrame(step);
        }
      };
      window.requestAnimationFrame(step);
    }

    // Helper function to extract text from PDF
    async function extractTextFromPDF() {
      // For demo purposes, return the content review text
      // In production, this should extract text from the PDF
      return document.getElementById('contentReview').innerText;
  }
});