import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})

// Attach JWT token only to protected employer requests (skip for public candidate endpoints)
api.interceptors.request.use((config) => {
  if (!config.url?.includes('/public/')) {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  return config
})

// Handle 401 → redirect to login only for protected employer routes and endpoints
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isPublicUrl = error.config?.url?.includes('/public/') || error.config?.url?.includes('/auth/')
    const isPublicPage = window.location.pathname.startsWith('/careers') || window.location.pathname === '/'

    if (error.response?.status === 401 && !isPublicUrl && !isPublicPage) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
