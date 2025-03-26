document.addEventListener('DOMContentLoaded', () => {
  const dropArea = document.getElementById('drop-area');
  const fileInput = document.getElementById('fileElem');
  const fileSelectBtn = document.getElementById('fileSelectBtn');
  const fileNameDisplay = document.getElementById('fileName');
  const reviewBtn = document.getElementById('reviewBtn');
  let selectedFile = null;

  // Open file selector on button click
  fileSelectBtn.addEventListener('click', () => {
    fileInput.click();
  });

  // Handle file selection from input
  fileInput.addEventListener('change', (event) => {
    handleFiles(event.target.files);
  });

  // Drag over: add hover style
  dropArea.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropArea.classList.add('hover');
  });

  // Drag leave: remove hover style
  dropArea.addEventListener('dragleave', () => {
    dropArea.classList.remove('hover');
  });

  // Handle file drop
  dropArea.addEventListener('drop', (event) => {
    event.preventDefault();
    dropArea.classList.remove('hover');
    if (event.dataTransfer.files && event.dataTransfer.files.length) {
      handleFiles(event.dataTransfer.files);
    }
  });

  // Validate and display selected file
  function handleFiles(files) {
    if (files.length > 0) {
      const file = files[0];
      if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file.');
        return;
      }
      selectedFile = file;
      fileNameDisplay.textContent = file.name;
      reviewBtn.disabled = false;

      // Read the file and store it in localStorage
      const reader = new FileReader();
      reader.onload = function(e) {
        localStorage.setItem('uploadedFile', e.target.result);
        localStorage.setItem('uploadedFileName', file.name);
      };
      reader.readAsDataURL(file);
    }
  }

  // Get Review button click: store file info and navigate
  reviewBtn.addEventListener('click', () => {
    if (selectedFile) {
      window.location.href = 'review.html';
    }
  });
});