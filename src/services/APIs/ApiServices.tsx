// api/apiService.ts - This is the ONLY additional file you need
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:44338';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API service that accepts token
export const apiServices = {
  // User Profile methods - matching your backend routes
  getUserProfile: (token: string) => 
    apiClient.get('/profile/getuserprofile', {
      headers: { Authorization: `Bearer ${token}` }
    }),

  updateUserProfile: (token: string, data: any) => 
    apiClient.post('/profile/updateuserprofile', data, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  deleteUserProfile: (token: string) => 
    apiClient.post('/profile/deleteuserprofilebyid', {}, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  deactivateUserProfile: (token: string, id: number) => 
    apiClient.post(`/profile/deactivateuserprofilebyid/${id}`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    }),

  // Add other endpoints as needed
  getTrips: (token: string) => 
    apiClient.get('/trips', {
      headers: { Authorization: `Bearer ${token}` }
    }),
};