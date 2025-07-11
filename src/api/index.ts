// API utility for backend communication
// Update BASE_URL to match your backend server

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// API Response Types
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export interface User {
  _id: string;
  id?: string; // Keep for backward compatibility
  name: string;
  email: string;
  role: 'superadmin' | 'manager' | 'user';
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Map of singular to plural endpoints
const ENDPOINT_MAP = {
  '/api/order': '/api/orders',
  '/api/user': '/api/users',
  '/api/product': '/api/products',
  '/api/customer': '/api/customers',
  '/api/task': '/api/tasks'
};

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  
  // Don't include Authorization header for login/logout endpoints
  const isAuthEndpoint = url.includes('/auth/login') || url === '/api/auth/login' || url.includes('/auth/logout');
  
  console.log(`API Request to ${url}:`, {
    method: options.method || 'GET',
    isAuthEndpoint,
    hasToken: !!token
  });
  
  // Create headers, explicitly excluding Authorization for auth endpoints
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };
  
  // Only add Authorization header if we have a token and it's not an auth endpoint
  if (token && !isAuthEndpoint) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Ensure no double slash and correct endpoint
  let fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  
  // Replace any singular endpoints with their plural forms
  Object.entries(ENDPOINT_MAP).forEach(([singular, plural]) => {
    if (fullUrl === `${BASE_URL}${singular}` || fullUrl.startsWith(`${BASE_URL}${singular}/`)) {
      fullUrl = fullUrl.replace(singular, plural);
    }
  });
  
  console.log('Final request URL:', fullUrl);

  try {
    console.log('API Request:', {
      url: fullUrl,
      method: options.method || 'GET',
      headers: {
        ...headers,
        Authorization: headers.Authorization ? 'Bearer [REDACTED]' : undefined
      },
      body: options.body,
    });
    
    // Don't include credentials for login endpoint to avoid CORS issues
    const credentials = isAuthEndpoint ? 'same-origin' : 'include';

    const res = await fetch(fullUrl, {
      ...options,
      headers,
      credentials,
    });

    // For DELETE requests, handle empty responses
    const isDeleteRequest = options.method === 'DELETE';
    let data;
    
    try {
      // Only try to parse JSON if there's content
      const text = await res.text();
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      // If parsing fails but it's a successful DELETE, that's fine
      if (isDeleteRequest && res.ok) {
        data = {};
      } else {
        console.error('Failed to parse response:', error);
        throw new ApiError(res.status, 'Invalid JSON response from server');
      }
    }

    console.log('API Response:', {
      url: fullUrl,
      status: res.status,
      ok: res.ok,
      data: isDeleteRequest && res.status === 204 ? '[No Content]' : data,
    });

    if (!res.ok) {
      // Handle authentication errors
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        if (url.includes('/auth/login')) {
          // Show backend error message for login
          const errorMessage = data?.message || (res.status === 401 
            ? 'Invalid email or password' 
            : 'You do not have permission to access this resource');
          throw new ApiError(res.status, errorMessage, data);
        } else {
          window.location.href = '/login';
          throw new ApiError(res.status, 'Session expired. Please login again.', data);
        }
      }
      throw new ApiError(res.status, data?.message || data?.error || 'API request failed', data);
    }

    if (data.status === 'error') {
      throw new ApiError(res.status, data.message || 'API request failed', data);
    }

    // For login endpoint, return the entire response
    if (url === '/login') {
      return data as T;
    }

    // For other endpoints, return the data property if it exists
    return data.data || data;
  } catch (error) {
    console.error('API Error:', {
      url: fullUrl,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: error instanceof ApiError ? error.status : undefined,
      data: error instanceof ApiError ? error.data : undefined
    });
    throw error;
  }
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  try {
    console.log('Attempting login with:', { email });
    
    const response = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ 
        email: email.trim(),
        password: password
      }),
      credentials: 'include',
    });

    console.log('Login response status:', response.status);
    
    let data;
    try {
      data = await response.json();
      console.log('Login response data:', data);
    } catch (jsonError) {
      console.error('Failed to parse login response:', jsonError);
      throw new Error('Invalid response from server');
    }

    if (!response.ok) {
      console.error('Login failed with status:', response.status, 'Data:', data);
      throw new ApiError(
        response.status, 
        data?.message || `Login failed with status ${response.status}`,
        data
      );
    }

    if (!data.data?.token) {
      console.error('No token in response:', data);
      throw new Error('Authentication failed: No token received');
    }

    console.log('Login successful, token received');
    const token = data.data.token;
    const user = data.data.user;
    
    if (!token) {
      throw new Error('No token received from server');
    }
    
    localStorage.setItem('token', token);
    
    // Ensure user data is properly set
    if (user) {
      setUserForLogging(user);
      return { token, user };
    } else {
      console.log('No user data in response, fetching user profile...');
      // If user data is not in the response, fetch it
      try {
        const userResponse = await apiRequest<User>('/api/users/me');
        setUserForLogging(userResponse);
        return { token, user: userResponse };
      } catch (userError) {
        console.error('Failed to fetch user profile:', userError);
        // Return partial data if we have a token but couldn't fetch user
        return { token, user: { email } as User };
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error('Failed to login. Please try again.');
  }
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/logout', { method: 'POST' });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem('token');
  }
}

// Store user info in localStorage for logging
export function setUserForLogging(user: User) {
  localStorage.setItem('user', JSON.stringify(user));
}

// Generic CRUD operations
export async function getItems<T>(endpoint: string): Promise<T[]> {
  return apiRequest<T[]>(endpoint);
}

export async function getItem<T>(endpoint: string, id: string): Promise<T> {
  return apiRequest<T>(`${endpoint}/${id}`);
}

export async function createItem<T>(endpoint: string, data: Partial<T>): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateItem<T>(endpoint: string, id: string, data: Partial<T>): Promise<T> {
  return apiRequest<T>(`${endpoint}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteItem(endpoint: string, id: string): Promise<void> {
  await apiRequest(`${endpoint}/${id}`, {
    method: 'DELETE'
  });
}

// Add more API helpers as needed (users, products, customers, etc.)
