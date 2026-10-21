export interface User {
  userId: string;
  email: string;
  name: string;
  isActive: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}
