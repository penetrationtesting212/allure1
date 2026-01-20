/**
 * Test script to check authentication and create a test user
 */

const http = require('http');

// Test 1: Check if we can register
const registerData = JSON.stringify({
  email: 'test@example.com',
  password: 'Test12345',
  name: 'Test User'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(registerData)
  }
};

console.log('🧪 Testing Authentication...\n');

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(`📊 Register Status: ${res.statusCode}`);
    console.log('📝 Response:', data);

    if (res.statusCode === 201 || res.statusCode === 200) {
      const response = JSON.parse(data);
      if (response.token || response.data?.token) {
        const token = response.token || response.data.token;
        console.log('\n✅ Registration successful!');
        console.log('🔑 Token:', token.substring(0, 50) + '...');
        console.log('\n💡 Use this token in the Authorization header:');
        console.log(`Authorization: Bearer ${token}`);
      }
    } else if (res.statusCode === 400 && data.includes('already exists')) {
      console.log('\n✅ User already exists. Trying to login...\n');

      // Try login
      const loginData = JSON.stringify({
        email: 'test@example.com',
        password: 'Test12345'
      });

      const loginOptions = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(loginData)
        }
      };

      const loginReq = http.request(loginOptions, (loginRes) => {
        let loginData = '';
        loginRes.on('data', chunk => loginData += chunk);
        loginRes.on('end', () => {
          console.log(`📊 Login Status: ${loginRes.statusCode}`);
          console.log('📝 Response:', loginData);

          if (loginRes.statusCode === 200) {
            const response = JSON.parse(loginData);
            if (response.token || response.data?.token) {
              const token = response.token || response.data.token;
              console.log('\n✅ Login successful!');
              console.log('🔑 Token:', token);
            }
          }
        });
      });

      loginReq.on('error', (error) => {
        console.error('❌ Login request error:', error.message);
      });

      loginReq.write(loginData);
      loginReq.end();
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  console.log('\n💡 Make sure the backend server is running on port 3001');
});

req.write(registerData);
req.end();
