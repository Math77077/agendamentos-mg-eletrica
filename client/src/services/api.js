import axios from 'axios';

// backend Node.js está configurado para rodar na porta 5000
export const api = axios.create({
  baseURL: 'http://localhost:5000/api', 
});

// injeta automaticamente o token em todas as requisições
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});