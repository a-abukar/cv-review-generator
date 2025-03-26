// API Configuration
const config = {
  apiUrl: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3000'
    : 'https://cv-review-generator.vercel.app'
};

export default config; 