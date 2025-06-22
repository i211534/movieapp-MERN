// components/Avatar.tsx
import Image from 'next/image';

interface AvatarProps {
    name: string;
    imageUrl?: string | null;
    size?: 'sm' | 'md' | 'lg';
}

export default function Avatar({ name, imageUrl, size = 'md' }: AvatarProps) {
    const getInitial = () => name.charAt(0).toUpperCase();

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-base',
        lg: 'w-20 h-20 text-2xl'
    };

    return (
        <div className={`relative rounded-full flex items-center justify-center 
                    bg-gradient-to-br from-indigo-500 to-purple-600
                    ${sizeClasses[size]}`}>
            {imageUrl ? (
                <Image
                    src={imageUrl.startsWith('http')
                        ? `${imageUrl}?ts=${new Date().getTime()}`
                        : `${process.env.NEXT_PUBLIC_API_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}?ts=${new Date().getTime()}`}
                    alt={name}
                    fill
                    className="rounded-full object-cover"
                    unoptimized
                />
            ) : (
                <span className="text-white font-bold">
                    {getInitial()}
                </span>
            )}
        </div>
    );
}