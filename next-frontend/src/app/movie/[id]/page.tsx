'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
    ArrowLeft,
    Calendar,
    Heart,
    Share2,
    Star,
    User
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Type definitions
interface Category {
    _id: string;
    name: string;
    description?: string;
}

interface Movie {
    _id: string;
    title: string;
    description: string;
    releaseDate: string;
    category: Category;
    imageUrl?: string;
    userRating?: number;
    averageRating?: number;
    totalRatings?: number;
    createdAt?: string;
    updatedAt?: string;
}

interface Rating {
    _id: string;
    score: number; // Changed from 'rating' to 'score' to match API
    review?: string;
    userId: string;
    movieId: string | Movie; // Can be populated or just ID
    user?: {
        _id: string;
        name: string;
        imageUrl?: string;
    };
    createdAt: string;
    updatedAt: string;
}

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const getImageUrl = (imageUrl: string | null | undefined): string => {
    if (!imageUrl) return '/api/placeholder/400/600';

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
    }

    if (imageUrl.startsWith('/')) {
        return `${API_BASE_URL}${imageUrl}`;
    }

    return `${API_BASE_URL}/${imageUrl}`;
};

const getUserAvatarUrl = (imageUrl: string | null | undefined): string => {
    if (!imageUrl) return '/api/placeholder/40/40';

    const timestamp = new Date().getTime();

    if (imageUrl.startsWith('http')) {
        return `${imageUrl}?ts=${timestamp}`;
    }

    return `${API_BASE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}?ts=${timestamp}`;
};

// API utility functions
const getAuthHeaders = (requireAuth: boolean = false) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Only add authorization header when required and valid token exists
    if (requireAuth && token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
};

const apiCall = async (endpoint: string, options: RequestInit = {}, requireAuth: boolean = false) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            ...getAuthHeaders(requireAuth),
            ...options.headers
        }
    });

    // if (!response.ok) {
    //     throw new Error(`API call failed: ${response.status} ${response.statusText}`);
    // }

    return response.json();
};

// API functions
const api = {
    async getMovieById(movieId: string): Promise<Movie | null> {
        try {
            const movie = await apiCall(`/movies/${movieId}`, {}, false); // No auth required
            return {
                ...movie,
                id: movie._id // Add id field for compatibility
            };
        } catch (error) {
            // Fallback to getting all movies and filtering
            try {
                const movies = await apiCall('/movies', {}, false); // No auth required
                const movie = movies.find((m: Movie) => m._id === movieId);
                return movie ? { ...movie, id: movie._id } : null;
            } catch (fallbackError) {
                console.error('Error fetching movie:', fallbackError);
                return null;
            }
        }
    },

    async getMovieRatings(movieId: string): Promise<Rating[]> {
        try {
            return await apiCall(`/ratings/movie/${movieId}`, {}, false); // No auth required
        } catch (error) {
            console.error('Error fetching movie ratings:', error);
            return [];
        }
    },

    async getMovieAverageRating(movieId: string): Promise<{ average: number; count: number }> {
        try {
            return await apiCall(`/ratings/movie/${movieId}/average`, {}, false); // No auth required
        } catch (error) {
            console.error('Error fetching average rating:', error);
            return { average: 0, count: 0 };
        }
    },

    async getUserRating(movieId: string): Promise<{ rating: number; review?: string } | null> {
        try {
            // Get user's ratings and find the one for this movie
            const userRatings = await apiCall('/ratings/me', {}, true); // Auth required
            const movieRating = userRatings.find((rating: Rating) => {
                // Handle both cases where movieId might be populated or just an ID
                if (!rating.movieId) {
                    return false; // Skip if movieId is null/undefined
                }

                const ratingMovieId = typeof rating.movieId === 'string'
                    ? rating.movieId
                    : rating.movieId._id;
                return ratingMovieId === movieId;
            });

            if (movieRating) {
                return {
                    rating: movieRating.score, // Map 'score' to 'rating'
                    review: movieRating.review
                };
            }
            return null;
        } catch (error) {
            console.error('Error fetching user rating:', error);
            return null;
        }
    },

    async submitRating(movieId: string, rating: number, review?: string): Promise<void> {
        await apiCall('/ratings', {
            method: 'POST',
            body: JSON.stringify({
                movieId,
                score: rating, // Use 'score' instead of 'rating'
                review: review || undefined
            })
        }, true); // Auth required
    },

    async updateRating(movieId: string, rating: number, review?: string): Promise<void> {
        // First get the rating ID
        const userRatings = await apiCall('/ratings/me', {}, true); // Auth required
        const movieRating = userRatings.find((r: Rating) => {
            const ratingMovieId = typeof r.movieId === 'string' ? r.movieId : r.movieId._id;
            return ratingMovieId === movieId;
        });

        if (movieRating) {
            await apiCall(`/ratings/${movieRating._id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    score: rating, // Use 'score' instead of 'rating'
                    review: review || undefined
                })
            }, true); // Auth required
        } else {
            // If no existing rating, create new one
            await this.submitRating(movieId, rating, review);
        }
    }
};

export default function MovieDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const movieId = params?.id ? (Array.isArray(params.id) ? params.id[0] : params.id) : '';

    const [movie, setMovie] = useState<Movie | null>(null);
    const [ratings, setRatings] = useState<Rating[]>([]);
    const [userRating, setUserRating] = useState<{ rating: number; review?: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [selectedRating, setSelectedRating] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [submittingRating, setSubmittingRating] = useState(false);

    useEffect(() => {
        if (movieId) {
            loadMovieDetails();
        }
    }, [movieId]);

    // Update the loadMovieDetails function
    const loadMovieDetails = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get movie details (no auth required)
            const movieData = await api.getMovieById(movieId);

            if (!movieData) {
                setError('Movie not found');
                return;
            }

            // Get ratings and average rating in parallel (no auth required)
            const [ratingsData, averageRating] = await Promise.all([
                api.getMovieRatings(movieId),
                api.getMovieAverageRating(movieId)
            ]);

            // Only fetch user rating if user is logged in
            let userRatingData = null;
            if (user) { // Add proper check here
                try {
                    userRatingData = await api.getUserRating(movieId);
                } catch (error) {
                    console.error('Error fetching user rating:', error);
                }
            }

            setMovie({
                ...movieData,
                averageRating: averageRating.average,
                totalRatings: averageRating.count
            });
            setRatings(ratingsData);
            setUserRating(userRatingData);

            if (userRatingData) {
                setSelectedRating(userRatingData.rating);
                setReviewText(userRatingData.review || '');
            }
        } catch (error) {
            console.error('Error loading movie details:', error);
            setError('Failed to load movie details. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleRatingSubmit = async () => {
        if (!user || selectedRating === 0) return;

        try {
            setSubmittingRating(true);

            if (userRating) {
                await api.updateRating(movieId, selectedRating, reviewText);
            } else {
                await api.submitRating(movieId, selectedRating, reviewText);
            }

            // Refresh data
            await loadMovieDetails();
            setShowRatingModal(false);
        } catch (error) {
            console.error('Error submitting rating:', error);
            alert('Failed to submit rating. Please try again.');
        } finally {
            setSubmittingRating(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading movie details...</p>
                </div>
            </div>
        );
    }

    if (error || !movie) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 mb-4">
                        <p className="text-lg font-semibold">Movie not found</p>
                    </div>
                    <p className="text-gray-600 mb-4">{error || 'The requested movie could not be found.'}</p>
                    <Link
                        href="/"
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Back to Home
                    </Link>
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
                        <Link
                            href="/"
                            className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                            <span>Back to Home</span>
                        </Link>

                        <div className="flex items-center space-x-4">
                            <button className="p-2 text-gray-700 hover:text-blue-600 transition-colors">
                                <Share2 className="w-5 h-5" />
                            </button>
                            <button className="p-2 text-gray-700 hover:text-red-600 transition-colors">
                                <Heart className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Movie Details */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="md:flex">
                        {/* Movie Poster */}
                        <div className="md:w-1/3">
                            <img
                                src={getImageUrl(movie.imageUrl)}
                                alt={movie.title}
                                className="w-full h-96 md:h-full object-cover"
                            />
                        </div>

                        {/* Movie Info */}
                        <div className="md:w-2/3 p-8">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                                        {movie.title}
                                    </h1>
                                    <div className="flex items-center space-x-4 text-gray-600 mb-4">
                                        <div className="flex items-center">
                                            <Calendar className="w-5 h-5 mr-1" />
                                            <span>{new Date(movie.releaseDate).getFullYear()}</span>
                                        </div>
                                        <div className="bg-gray-200 px-3 py-1 rounded-full text-sm">
                                            {movie.category.name}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Rating Display - Show for all users */}
                            {movie.averageRating !== undefined && movie.averageRating > 0 && movie.totalRatings && movie.totalRatings > 0 && (
                                <div className="flex items-center space-x-4 mb-6">
                                    <div className="flex items-center">
                                        <Star className="w-6 h-6 text-yellow-500 fill-current" />
                                        <span className="text-2xl font-bold ml-2">{movie.averageRating.toFixed(1)}</span>
                                        <span className="text-gray-600 ml-1">/ 5</span>
                                    </div>
                                    <span className="text-gray-600">({movie.totalRatings} ratings)</span>
                                </div>
                            )}

                            {/* User Rating Section - Only show if user is logged in */}
                            {user && (
                                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-gray-900">Your Rating</p>
                                            {userRating ? (
                                                <div className="flex items-center mt-2">
                                                    <div className="flex">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Star
                                                                key={star}
                                                                className={`w-5 h-5 ${star <= userRating.rating
                                                                    ? 'text-yellow-500 fill-current'
                                                                    : 'text-gray-300'
                                                                    }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className="ml-2 text-gray-600">{userRating.rating}/5</span>
                                                </div>
                                            ) : (
                                                <p className="text-gray-600 mt-1">Not rated yet</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setShowRatingModal(true)}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            {userRating ? 'Update Rating' : 'Rate Movie'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Login Prompt for Logged Out Users */}
                            {!user && (
                                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-blue-900">Want to rate this movie?</p>
                                            <p className="text-blue-700 text-sm">Sign in to rate and review movies</p>
                                        </div>
                                        <Link
                                            href="/auth/signin"
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                        >
                                            Sign In
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Description */}
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold text-gray-900 mb-3">Plot</h2>
                                <p className="text-gray-700 leading-relaxed">{movie.description}</p>
                            </div>

                            {/* Additional Info */}
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                                <div>
                                    <span className="font-semibold">Release Date:</span>
                                    <br />
                                    {new Date(movie.releaseDate).toLocaleDateString()}
                                </div>
                                <div>
                                    <span className="font-semibold">Category:</span>
                                    <br />
                                    {movie.category.name}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reviews Section */}
                <div className="mt-8 bg-white rounded-lg shadow-lg p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Reviews</h2>

                    {ratings.length > 0 ? (
                        <div className="space-y-6">
                            {ratings.map((rating) => (
                                <div key={rating._id} className="border-b border-gray-200 pb-6 last:border-b-0">
                                    <div className="flex items-start space-x-4">
                                        {/* Updated user image with anonymous placeholder */}
                                        {rating.user?.imageUrl ? (
                                            <img
                                                src={getUserAvatarUrl(rating.user.imageUrl)}
                                                alt={rating.user?.name || 'User'}
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                                                <User className="w-6 h-6 text-white" />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <div>
                                                    <h4 className="font-semibold text-gray-900">
                                                        {rating.user?.name || 'Anonymous User'}
                                                    </h4>
                                                    <div className="flex items-center mt-1">
                                                        <div className="flex">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <Star
                                                                    key={star}
                                                                    className={`w-4 h-4 ${star <= rating.score
                                                                        ? 'text-yellow-500 fill-current'
                                                                        : 'text-gray-300'
                                                                        }`}
                                                                />
                                                            ))}
                                                        </div>
                                                        <span className="ml-2 text-sm text-gray-600">
                                                            {rating.score}/5
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="text-sm text-gray-500">
                                                    {new Date(rating.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            {rating.review && (
                                                <p className="text-gray-700 mt-2">{rating.review}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>No reviews yet. {user ? 'Be the first to rate this movie!' : 'Sign in to be the first to rate this movie!'}</p>
                        </div>
                    )}
                </div>
            </main>

            {/* Rating Modal - Only show for logged in users */}
            {showRatingModal && user && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                            {userRating ? 'Update Your Rating' : 'Rate This Movie'}
                        </h3>

                        {/* Star Rating */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Your Rating
                            </label>
                            <div className="flex space-x-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => setSelectedRating(star)}
                                        className="focus:outline-none"
                                    >
                                        <Star
                                            className={`w-8 h-8 transition-colors ${star <= selectedRating
                                                ? 'text-yellow-500 fill-current'
                                                : 'text-gray-300 hover:text-yellow-400'
                                                }`}
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Review Text */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Review (Optional)
                            </label>
                            <textarea
                                value={reviewText}
                                onChange={(e) => setReviewText(e.target.value)}
                                placeholder="Share your thoughts about this movie..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                rows={4}
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowRatingModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRatingSubmit}
                                disabled={selectedRating === 0 || submittingRating}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submittingRating ? 'Submitting...' : (userRating ? 'Update' : 'Submit')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 