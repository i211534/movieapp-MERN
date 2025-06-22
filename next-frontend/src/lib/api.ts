import { getSession } from "next-auth/react"

const NEST_API_URL = process.env.NEXT_PUBLIC_NEST_API_URL || "http://localhost:3001"

// API client with automatic token handling
export async function apiClient(endpoint: string, options: RequestInit = {}) {
    const session = await getSession()

    const config: RequestInit = {
        headers: {
            "Content-Type": "application/json",
            ...(session?.accessToken && {
                Authorization: `Bearer ${session.accessToken}`,
            }),
            ...options.headers,
        },
        ...options,
    }

    const response = await fetch(`${NEST_API_URL}${endpoint}`, config)

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
}

// Signup function (since NextAuth doesn't handle registration)
export async function signupUser(userData: {
    email: string
    password: string
    name: string
    address?: string
    dob?: string
}) {
    const response = await fetch(`${NEST_API_URL}/auth/signup`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
    })

    if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Signup failed")
    }

    return response.json()
}