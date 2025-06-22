'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, ArrowLeft, Calendar, Film, Heart, RefreshCw, Star } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

// Type definitions
interface Category {
    id: string;
    name: string;
    description?: string;
}

interface MovieWithRating extends Movie {
    averageRating?: number;
    totalRatings?: number;
}

interface Movie {
    id: string;
    title: string;
    description: string;
    releaseDate: string;
    category: Category;
    imageUrl?: string;
    createdAt: string;
    updatedAt: string;
}

interface RecommendationItem {
    movie: MovieWithRating;
    score: number;
}

interface RecommendationsResponse {
    recommendations: RecommendationItem[];
    totalCount: number;
}

// API Response types (what actually comes from your API)
interface ApiRecommendationItem {
    _id: string;
    title: string;
    description: string;
    releaseDate: string;
    category: {
        _id: string;
        name: string;
        description?: string;
    };
    imageUrl?: string;
    createdAt: string;
    updatedAt: string;
    recommendationScore: number;
}

interface ApiRecommendationsResponse {
    recommendations: ApiRecommendationItem[];
    total: number;
    userId: string;
    generatedAt: string;
}

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Image utility function
const getImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return '/api/placeholder/300/450';
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${API_BASE_URL}${imageUrl}`;
};

// API utility functions
const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    console.log('Getting auth headers - Token exists:', !!token);
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
    };
};

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('Making API call to:', url);

    const headers = {
        ...getAuthHeaders(),
        ...options.headers
    };

    console.log('Request headers:', headers);

    const response = await fetch(url, {
        ...options,
        headers
    });

    console.log('API Response status:', response.status);
    console.log('API Response ok:', response.ok);

    if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('API Response data:', data);
    return data;
};

// Transform API response to match frontend expectations
const transformApiResponse = (apiResponse: ApiRecommendationsResponse): RecommendationsResponse => {
    console.log('Transforming API response:', apiResponse);
    return {
        recommendations: apiResponse.recommendations.map(item => ({
            movie: {
                id: item._id,
                title: item.title,
                description: item.description,
                releaseDate: item.releaseDate,
                category: {
                    id: item.category._id,
                    name: item.category.name,
                    description: item.category.description
                },
                imageUrl: item.imageUrl,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
            },
            score: item.recommendationScore
        })),
        totalCount: apiResponse.total
    };
};

// API functions
const api = {
    async getRecommendations(limit: number = 12): Promise<RecommendationsResponse> {
        console.log('Fetching recommendations with limit:', limit);
        const apiResponse: ApiRecommendationsResponse = await apiCall(`/recommendations?limit=${limit}`);
        return transformApiResponse(apiResponse);
    },

    async getRecommendationHealth(): Promise<{ status: string; service: string }> {
        // Try multiple possible health endpoints
        const possibleEndpoints = [
            '/recommendations/health',
            '/health',
            '/api/health'
        ];

        for (const endpoint of possibleEndpoints) {
            try {
                console.log('Trying health endpoint:', endpoint);
                return await apiCall(endpoint);
            } catch (error) {
                console.log(`Health endpoint ${endpoint} failed:`, error);
                continue;
            }
        }

        // If all endpoints fail, return a default response
        console.log('All health endpoints failed, returning default');
        return { status: 'unknown', service: 'recommendations' };
    },

    async getMovieAverageRating(movieId: string): Promise<{ average: number; count: number }> {
        try {
            return await apiCall(`/ratings/movie/${movieId}/average`);
        } catch (error) {
            console.log(`Failed to get rating for movie ${movieId}:`, error);
            return { average: 0, count: 0 };
        }
    }
};

// Enhanced RecommendationCard Component
const RecommendationCard = ({ item }: { item: RecommendationItem }) => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group">
        <div className="relative aspect-[2/3] bg-gray-200 overflow-hidden">
            <img
                src={getImageUrl(item.movie.imageUrl)}
                alt={item.movie.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                    e.currentTarget.src = '/api/placeholder/300/450';
                }}
            />
            <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium">
                {item.movie.category?.name}
            </div>
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>

        <div className="p-4">
            <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                {item.movie.title}
            </h3>
            <p className="text-gray-600 text-sm mb-3 line-clamp-2 leading-relaxed">
                {item.movie.description}
            </p>

            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{new Date(item.movie.releaseDate).getFullYear()}</span>
                </div>
                {item.movie.averageRating && item.movie.totalRatings && item.movie.totalRatings > 0 && (
                    <div className="flex items-center bg-yellow-50 px-2 py-1 rounded">
                        <Star className="w-4 h-4 mr-1 text-yellow-500 fill-current" />
                        <span className="font-medium">{item.movie.averageRating.toFixed(1)}</span>
                        <span className="ml-1 text-gray-400">({item.movie.totalRatings})</span>
                    </div>
                )}
            </div>

            <div className="flex space-x-2">
                <Link
                    href={`/movie/${item.movie.id}`}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded text-center hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                    View Details
                </Link>
                <button className="p-2 border border-gray-300 rounded hover:bg-gray-50 hover:border-red-300 transition-colors group/heart">
                    <Heart className="w-4 h-4 group-hover/heart:text-red-500 transition-colors" />
                </button>
            </div>
        </div>
    </div>
);

// Loading skeleton component
const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                <div className="aspect-[2/3] bg-gray-300"></div>
                <div className="p-4">
                    <div className="h-6 bg-gray-300 rounded mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded mb-1"></div>
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-3"></div>
                    <div className="flex justify-between items-center mb-4">
                        <div className="h-4 bg-gray-300 rounded w-20"></div>
                        <div className="h-4 bg-gray-300 rounded w-16"></div>
                    </div>
                    <div className="flex space-x-2">
                        <div className="flex-1 h-8 bg-gray-300 rounded"></div>
                        <div className="w-8 h-8 bg-gray-300 rounded"></div>
                    </div>
                </div>
            </div>
        ))}
    </div>
);

export default function RecommendationsPage() {
    const { user, loading: authLoading, isAuthenticated } = useAuth();
    const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [healthStatus, setHealthStatus] = useState<string>('unknown');

    // Debug logging
    useEffect(() => {
        console.log('Auth state changed:', {
            user: !!user,
            userId: user?.id,
            authLoading,
            isAuthenticated
        });
    }, [user, authLoading, isAuthenticated]);

    useEffect(() => {
        if (authLoading) {
            console.log('Auth still loading, waiting...');
            return;
        }

        if (!isAuthenticated || !user) {
            console.log('User not authenticated');
            setLoading(false);
            return;
        }

        console.log('User authenticated, fetching data...');
        checkServiceHealth();
        fetchRecommendations();
    }, [user?.id, authLoading, isAuthenticated]);

    const checkServiceHealth = async (): Promise<void> => {
        try {
            console.log('Checking service health...');
            const health = await api.getRecommendationHealth();
            console.log('Health check result:', health);
            setHealthStatus(health.status);
        } catch (err) {
            console.error('Health check failed:', err);
            setHealthStatus('unhealthy');
        }
    };

    const fetchRecommendations = async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);
            console.log('Fetching recommendations...');

            const data = await api.getRecommendations(12);
            console.log('Recommendations received:', data);

            // Removed filtering - show all recommendations regardless of score
            console.log('Showing all recommendations:', data.recommendations.length);

            // Fetch ratings for each recommended movie
            const recommendationsWithRatings = await Promise.all(
                data.recommendations.map(async (item) => {
                    try {
                        const rating = await api.getMovieAverageRating(item.movie.id);
                        return {
                            ...item,
                            movie: {
                                ...item.movie,
                                averageRating: rating.average,
                                totalRatings: rating.count
                            }
                        };
                    } catch (error) {
                        console.error(`Error fetching rating for movie ${item.movie.id}:`, error);
                        return item;
                    }
                })
            );

            console.log('Final recommendations with ratings:', recommendationsWithRatings);
            setRecommendations(recommendationsWithRatings);
        } catch (err: any) {
            console.error('Error fetching recommendations:', err);
            setError(err.message || 'Failed to load recommendations');
        } finally {
            setLoading(false);
        }
    };

    // Show loading while auth is initializing
    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex items-center">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mr-3" />
                    <span className="text-gray-600">Loading...</span>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto p-6">
                    <Film className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h2>
                    <p className="text-gray-600 mb-6">
                        You need to be signed in to view personalized recommendations.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link
                            href="/auth/signin"
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/"
                            className="text-gray-600 hover:text-gray-800 transition-colors px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Go Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                            <span className="font-medium">Back to Home</span>
                        </Link>

                        <div className="flex items-center space-x-3">
                            <div className={`w-2 h-2 rounded-full ${healthStatus === 'healthy' ? 'bg-green-500' :
                                healthStatus === 'unhealthy' ? 'bg-red-500' : 'bg-yellow-500'
                                }`}></div>
                            <span className="text-sm text-gray-500">
                                Service: {healthStatus}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Header */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-3">
                        Recommended for You
                    </h1>
                    <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                        Based on your ratings and preferences, here are movies you might enjoy
                    </p>
                </div>

                {loading ? (
                    <LoadingSkeleton />
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center max-w-2xl mx-auto">
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-red-800 mb-3">Unable to Load Recommendations</h3>
                        <p className="text-red-700 mb-4">{error}</p>
                        {healthStatus === 'unhealthy' && (
                            <p className="text-red-600 text-sm mb-4">
                                Recommendation service is currently unavailable
                            </p>
                        )}
                        <button
                            onClick={fetchRecommendations}
                            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium"
                        >
                            Try Again
                        </button>
                    </div>
                ) : recommendations.length === 0 ? (
                    <div className="text-center py-16 max-w-2xl mx-auto">
                        <Heart className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                        <h3 className="text-2xl font-semibold text-gray-600 mb-3">
                            No recommendations yet
                        </h3>
                        <p className="text-gray-500 mb-8 text-lg">
                            Rate some movies to get personalized recommendations
                        </p>
                        <Link
                            href="/movie/browse"
                            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg"
                        >
                            Browse Movies to Rate
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Recommendations Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mb-12">
                            {recommendations.map((item) => (
                                <RecommendationCard key={item.movie.id} item={item} />
                            ))}
                        </div>

                        {/* Refresh Button */}
                        <div className="text-center">
                            <button
                                onClick={fetchRecommendations}
                                disabled={loading}
                                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center mx-auto font-medium"
                            >
                                <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh Recommendations
                            </button>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}