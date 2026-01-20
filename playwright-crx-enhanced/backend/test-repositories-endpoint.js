require('dotenv').config();

async function testRepositoriesEndpoint() {
  try {
    console.log('Testing repositories endpoint...');
    
    // Try login first; on failure, register a fresh user and retry
    const loginBody = {
      email: 'demo@example.com',
      password: 'demo123'
    };

    let token;
    let loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginBody)
    });

    if (!loginResponse.ok) {
      const errText = await loginResponse.text();
      console.warn(`Login failed for demo user: ${loginResponse.status} - ${errText}`);
      console.log('Attempting to register a new user as fallback...');

      const newEmail = `repo_test_${Date.now()}@example.com`;
      const registerBody = {
        email: newEmail,
        password: 'Test123!',
        name: 'Repo Tester'
      };

      const registerResponse = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerBody)
      });

      if (!registerResponse.ok) {
        const regErr = await registerResponse.text();
        throw new Error(`Register failed: ${registerResponse.status} - ${regErr}`);
      }

      console.log('✅ Registration successful, retrying login with new user');
      // Retry login with the new user
      loginResponse = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: 'Test123!' })
      });

      if (!loginResponse.ok) {
        const retryErr = await loginResponse.text();
        throw new Error(`Login retry failed: ${loginResponse.status} - ${retryErr}`);
      }
    }

    const loginData = await loginResponse.json();
    token = loginData.accessToken || loginData.token;
    if (!token) throw new Error('No token returned from login response');
    console.log('✅ Login successful, got token');
    
    // Now test the repositories endpoint
    const repositoriesResponse = await fetch('http://localhost:3001/api/test-data-management/repositories', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('Response status:', repositoriesResponse.status);
    
    if (repositoriesResponse.ok) {
      const data = await repositoriesResponse.json();
      console.log('✅ Repositories endpoint successful!');
      console.log('Response data:', JSON.stringify(data, null, 2));
    } else {
      const errorData = await repositoriesResponse.text();
      console.error('❌ Repositories endpoint failed');
      console.error('Error data:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Error testing repositories endpoint:', error.message);
  }
}

testRepositoriesEndpoint();