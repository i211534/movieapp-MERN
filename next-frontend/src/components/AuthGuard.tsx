// next-frontend/components/AuthGuard.tsx
import { useSession } from "next-auth/react"
import { useRouter } from "next/router"
import { useEffect } from "react"

interface AuthGuardProps {
    children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
    const { status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/auth/signin")
        }
    }, [status, router])

    if (status === "loading") {
        return <div className="flex justify-center items-center min-h-screen">Loading...</div>
    }

    if (status === "unauthenticated") {
        return null
    }

    return <>{children}</>
}