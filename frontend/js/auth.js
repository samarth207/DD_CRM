document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorMessage = document.getElementById('error-message');
  
  // Debug logging
  console.log('Current hostname:', window.location.hostname);
  console.log('API_URL:', API_URL);
  console.log('Login endpoint:', `${API_URL}/auth/login`);
  console.log('Request payload:', { email, password: '***' });
  
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response data:', data);
    
    if (response.ok) {
      // Store token and user info
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Redirect based on role - use replace() to avoid cache issues
      if (data.user.role === 'admin') {
        window.location.replace('admin.html?t=' + Date.now());
      } else {
        window.location.replace('user.html?t=' + Date.now());
      }
    } else {
      console.error('Login failed:', data);
      errorMessage.textContent = data.message || 'Login failed';
      errorMessage.style.display = 'block';
    }
  } catch (error) {
    console.error('Login error:', error);
    errorMessage.textContent = 'An error occurred. Please try again.';
    errorMessage.style.display = 'block';
    console.error('Login error:', error);
  }
});
