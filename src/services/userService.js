const getAuthHeader = () => {
  const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const API_URL = '/api/users';

async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = data.error || data.message || response.statusText;
    throw new Error(error);
  }
  return data;
}

export const userService = {
  async getUsers() {
    const response = await fetch(API_URL, {
      headers: getAuthHeader()
    });
    return handleResponse(response);
  },

  async getUser(id) {
    const response = await fetch(`${API_URL}/${id}`, {
      headers: getAuthHeader()
    });
    return handleResponse(response);
  },

  async createUser(userData) {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(userData)
    });
    return handleResponse(response);
  },

  async updateUser(id, userData) {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify(userData)
    });
    return handleResponse(response);
  },

  async updateUserStatus(id, isActive) {
    const response = await fetch(`${API_URL}/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ is_active: isActive })
    });
    return handleResponse(response);
  },

  async resetPassword(id, newPassword) {
    const response = await fetch(`${API_URL}/${id}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ password: newPassword })
    });
    return handleResponse(response);
  },

  async deleteUser(id) {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse(response);
  }
};
