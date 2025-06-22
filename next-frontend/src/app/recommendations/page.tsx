'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, ArrowLeft, Calendar, Film, Heart, RefreshCw, Star } from 'lucide-react';
import Image from 'next/image';
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
                <div className="text-center">
                    <Film className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Sign In Required</h2>
                    <p className="text-gray-600 mb-6">
                        You need to be signed in to view personalized recommendations.
                    </p>
                    <div className="space-x-4">
                        <Link
                            href="/auth/signin"
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Sign In
                        </Link>
                        <Link
                            href="/"
                            className="text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Go Home
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                {/* Header */}
                <header className="bg-white shadow-md">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center h-16">
                            <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                                <ArrowLeft className="w-5 h-5" />
                                <span>Back to Home</span>
                            </Link>
                        </div>
                    </div>
                </header>

                <div className="flex items-center justify-center h-64 mt-16">
                    <RefreshCw className="w-12 h-12 animate-spin text-blue-600" />
                    <span className="ml-3 text-gray-600">Loading your recommendations...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
                            <ArrowLeft className="w-5 h-5" />
                            <span>Back to Home</span>
                        </Link>

                        <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${healthStatus === 'healthy' ? 'bg-green-500' : 'bg-red-500'
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
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Recommended for You
                    </h1>
                    <p className="text-gray-600">
                        Based on your ratings and preferences, here are movies you might enjoy
                    </p>
                </div>

                {error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Load Recommendations</h3>
                        <p className="text-red-700 mb-4">{error}</p>
                        {healthStatus === 'unhealthy' && (
                            <p className="text-red-600 text-sm mb-4">
                                Recommendation service is currently unavailable
                            </p>
                        )}
                        <button
                            onClick={fetchRecommendations}
                            className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : recommendations.length === 0 ? (
                    <div className="text-center py-16">
                        <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-600 mb-2">
                            No recommendations yet
                        </h3>
                        <p className="text-gray-500 mb-6">
                            Rate some movies to get personalized recommendations
                        </p>
                        <Link
                            href="/movie/browse"
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Browse Movies to Rate
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* Recommendations Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                            {recommendations.map((item) => (
                                <div
                                    key={item.movie.id}
                                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                                >
                                    <div className="relative">
                                        <Image
                                            src={item.movie.imageUrl || '/api/placeholder/300/400'}
                                            alt={item.movie.title}
                                            width={300}
                                            height={400}
                                            className="w-full h-48 object-cover"
                                        />
                                        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-sm">
                                            {item.movie.category?.name}
                                        </div>
                                    </div>

                                    <div className="p-4">
                                        <h3 className="font-bold text-lg mb-2 line-clamp-1">{item.movie.title}</h3>
                                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.movie.description}</p>

                                        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                                            <div className="flex items-center">
                                                <Calendar className="w-4 h-4 mr-1" />
                                                {new Date(item.movie.releaseDate).getFullYear()}
                                            </div>
                                            {item.movie.averageRating && item.movie.totalRatings && item.movie.totalRatings > 0 && (
                                                <div className="flex items-center">
                                                    <Star className="w-4 h-4 mr-1 text-yellow-500 fill-current" />
                                                    <span>{item.movie.averageRating.toFixed(1)}</span>
                                                    <span className="ml-1">({item.movie.totalRatings})</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex space-x-2">
                                            <Link
                                                href={`/movie/${item.movie.id}`}
                                                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded text-center hover:bg-blue-700 transition-colors"
                                            >
                                                View Details
                                            </Link>
                                            <button className="p-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors">
                                                <Heart className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Refresh Button */}
                        <div className="text-center">
                            <button
                                onClick={fetchRecommendations}
                                disabled={loading}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center mx-auto"
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                Refresh Recommendations
                            </button>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}