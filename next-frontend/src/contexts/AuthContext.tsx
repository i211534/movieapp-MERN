"use client";
import { ReactNode, createContext, useContext, useEffect, useState } from 'react';

interface User {
    id: string;
    email: string;
    name: string;
    address?: string;
    imageUrl?: string;
    dob?: Date;
    categories: string[];
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    signup: (userData: any) => Promise<void>;
    logout: () => void;
    updateUser: (userData: Partial<User>) => void;
    loading: boolean;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isClient, setIsClient] = useState(false);

    // Handle client-side hydration
    useEffect(() => {
        setIsClient(true);
    }, []);

    // Initialize auth state from localStorage only on client side
    useEffect(() => {
        if (!isClient) return;

        try {
            const storedToken = localStorage.getItem('access_token');
            const storedUser = localStorage.getItem('user');

            console.log('Auth initialization - Token exists:', !!storedToken);
            console.log('Auth initialization - User exists:', !!storedUser);

            if (storedToken && storedUser) {
                const parsedUser = JSON.parse(storedUser);
                console.log('Auth initialization - Parsed user:', parsedUser);

                setToken(storedToken);
                setUser(parsedUser);
            }
        } catch (error) {
            console.error('Error parsing stored auth data:', error);
            // Clear corrupted data
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
        }

        setLoading(false);
    }, [isClient]);

    const login = async (email: string, password: string) => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Login failed');
            }

            const data = await response.json();
            console.log('Login successful:', data);

            // Store in localStorage
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Update state
            setToken(data.access_token);
            setUser(data.user);
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const signup = async (userData: any) => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Signup failed');
            }

            const data = await response.json();
            console.log('Signup successful:', data);

            // Store in localStorage
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Update state
            setToken(data.access_token);
            setUser(data.user);
        } catch (error) {
            console.error('Signup error:', error);
            throw error;
        }
    };

    const updateUser = (userData: Partial<User>) => {
        if (!user) return;

        const updatedUser = {
            ...user,
            ...userData,
            // Ensure imageUrl is properly updated
            imageUrl: userData.imageUrl || user.imageUrl
        };

        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        setToken(null);
        setUser(null);
    };

    const value = {
        user,
        token,
        login,
        signup,
        logout,
        updateUser,
        loading,
        isAuthenticated: !!user && !!token,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}