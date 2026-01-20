// src/app/theme/shared/models/auth.model.ts
export interface AuthResponse {
  token: string;
  role: string;
  schoolId: string;
  user:User;
  userId: string;
  teacherId?: string;
  studentId?:string;
  activeAcademicYearId?: string;
}
export interface User{
    id:string
    email:string;
    username:string;
    role:string
}

export interface UserResponse {
  message?: string;
  data: {
    _id: string;
    name: string;
    email: string;
    username?: string;
    additionalInfo?: any;
    role?: string;
    schoolId?: string;
  };
}