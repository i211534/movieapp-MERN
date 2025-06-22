import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

const NEST_API_URL = process.env.NEST_API_URL || "http://localhost:3001"

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                try {
                    // Call Nest.js login endpoint
                    const response = await fetch(`${NEST_API_URL}/auth/login`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        }),
                    })

                    if (!response.ok) {
                        return null
                    }

                    const data = await response.json()

                    // Expected response from Nest.js: { access_token: string, user: {...} }
                    if (data.access_token && data.user) {
                        return {
                            id: data.user.id || data.user._id,
                            email: data.user.email,
                            name: data.user.name,
                            image: data.user.imageUrl,
                            accessToken: data.access_token,
                            // Include other user fields as needed
                            address: data.user.address,
                            dob: data.user.dob,
                            categories: data.user.categories,
                        }
                    }

                    return null
                } catch (error) {
                    console.error("Authentication error:", error)
                    return null
                }
            }
        })
    ],

    callbacks: {
        async jwt({ token, user, account }) {
            // Persist the access token to the token right after signin
            if (account && user) {
                token.accessToken = (user as any).accessToken
                token.address = (user as any).address
                token.dob = (user as any).dob
                token.categories = (user as any).categories
            }
            return token
        },

        async session({ session, token }) {
            // Send properties to the client
            if (token) {
                session.accessToken = token.accessToken as string
                session.user.id = token.sub as string
                session.user.address = token.address as string
                session.user.dob = token.dob as string
                session.user.categories = token.categories as string[]
            }
            return session
        }
    },

    pages: {
        signIn: "/auth/signin",
    },

    session: {
        strategy: "jwt",
    },

    secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)