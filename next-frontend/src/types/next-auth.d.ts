import { DefaultSession } from "next-auth"

declare module "next-auth" {
    interface Session {
        accessToken?: string
        user: {
            id: string
            address?: string
            dob?: string
            categories?: string[]
        } & DefaultSession["user"]
    }

    interface User {
        accessToken?: string
        address?: string
        dob?: string
        categories?: string[]
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        accessToken?: string
        address?: string
        dob?: string
        categories?: string[]
    }
}