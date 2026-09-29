import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

// Attach appropriate JWT token: admin_token for admin endpoints, regular token for employer requests
api.interceptors.request.use((config) => {
  if (config.url?.includes('/admin') && !config.url?.includes('/admin/login')) {
    const adminToken = localStorage.getItem('admin_token')
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`
      return config
    }
  }

  if (!config.url?.includes('/public/')) {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Handle 401: redirect admin routes to /admin/login, recruiter routes to /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isPublicUrl = error.config?.url?.includes('/public/') || error.config?.url?.includes('/auth/')
    const isPublicPage = window.location.pathname.startsWith('/careers') || window.location.pathname === '/'

    if (error.response?.status === 401) {
      if (error.config?.url?.includes('/admin') || window.location.pathname.startsWith('/admin')) {
        localStorage.removeItem('admin_token')
        if (window.location.pathname !== '/admin/login') {
          window.location.href = '/admin/login'
        }
        return Promise.reject(error)
      }

      if (!isPublicUrl && !isPublicPage) {
        localStorage.removeItem('token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
