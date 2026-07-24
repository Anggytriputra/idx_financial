const fs = require('fs');
const path = require('path');

// Parse .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      process.env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/^"(.*)"$/, '$1');
    }
  });
}

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Say hi' }] }]
      })
    });

    const data = await response.json();
    console.log('MODEL: gemini-1.5-flash');
    console.log('HTTP STATUS:', response.status);
    console.log('RESPONSE:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('FETCH ERROR:', err);
  }
}

run();
