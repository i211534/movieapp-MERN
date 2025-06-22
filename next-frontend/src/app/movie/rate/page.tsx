'use client';

import { AlertCircle, Calendar, Film, RefreshCw, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useState } from 'react';

// Type definitions matching your API responses
interface Category {
    id: string;
    name: string;
    description?: string;
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

interface MovieWithRating extends Movie {
    userRating?: number;
}

interface RateMovieProps {
    movie: MovieWithRating;
    onRatingSubmit?: (movieId: string, rating: number) => void;
}

// API Configuration - Match your main page configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// API utility functions
const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
    };
};

// API functions
const api = {
    async rateMovie(movieId: string, rating: number): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/ratings`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ movieId, score: rating })
        });

        if (!response.ok) {
            throw new Error('Failed to rate movie');
        }

        // Check if response has content before parsing JSON
        const text = await response.text();
        return text ? JSON.parse(text) : {};
    },

    async getMovies(): Promise<Movie[]> {
        const response = await fetch(`${API_BASE_URL}/movies`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to fetch movies');
        }

        return response.json();
    },

    async searchMovies(query: string): Promise<Movie[]> {
        const response = await fetch(`${API_BASE_URL}/movies/search?q=${encodeURIComponent(query)}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error('Failed to search movies');
        }

        return response.json();
    },

    async getMyRatingForMovie(movieId: string): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/ratings/movie/${movieId}/me`, {
            headers: getAuthHeaders()
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error('Failed to fetch user rating');
        }

        // Check if response has content before parsing JSON
        const text = await response.text();
        if (!text || text.trim() === '') {
            return null;
        }

        try {
            return JSON.parse(text);
        } catch (error) {
            console.error('Failed to parse JSON response:', text);
            return null;
        }
    },

    async deleteMyRating(movieId: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/ratings/movie/${movieId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok && response.status !== 404) {
            throw new Error('Failed to delete rating');
        }
    }
};

// Rate Movie Component
const RateMovie: React.FC<RateMovieProps> = ({ movie, onRatingSubmit }) => {
    const [hoveredRating, setHoveredRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userRating, setUserRating] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchUserRating();
    }, [movie.id]);

    const fetchUserRating = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const rating = await api.getMyRatingForMovie(movie.id);
            setUserRating(rating?.score || 0);
        } catch (err) {
            console.error('Error fetching user rating:', err);
            setError('Failed to load existing rating');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRatingClick = async (selectedRating: number) => {
        setIsSubmitting(true);
        setError(null);

        try {
            await api.rateMovie(movie.id, selectedRating);
            setUserRating(selectedRating);

            if (onRatingSubmit) {
                onRatingSubmit(movie.id, selectedRating);
            }
        } catch (error) {
            console.error('Error submitting rating:', error);
            setError('Failed to submit rating. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteRating = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            await api.deleteMyRating(movie.id);
            setUserRating(0);

            if (onRatingSubmit) {
                onRatingSubmit(movie.id, 0);
            }
        } catch (error) {
            console.error('Error deleting rating:', error);
            setError('Failed to delete rating. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
                <div className="animate-pulse">
                    <div className="flex items-center space-x-4 mb-4">
                        <div className="w-20 h-30 bg-gray-300 rounded"></div>
                        <div className="flex-1">
                            <div className="h-6 bg-gray-300 rounded mb-2"></div>
                            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                        </div>
                    </div>
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
            <div className="flex items-center space-x-4 mb-4">
                <Image
                    src={movie?.imageUrl || '/api/placeholder/80/120'}
                    alt={movie?.title}
                    width={80}
                    height={120}
                    className="w-20 h-30 object-cover rounded"
                />
                <div>
                    <h3 className="text-xl font-bold text-gray-800">{movie?.title}</h3>
                    <p className="text-gray-600 text-sm">{movie?.category?.name}</p>
                    <div className="flex items-center text-gray-500 text-sm mt-1">
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(movie?.releaseDate).getFullYear()}
                    </div>
                </div>
            </div>

            <div className="mb-4">
                <p className="text-gray-700 text-sm line-clamp-3">{movie?.description}</p>
            </div>

            <div className="text-center">
                <h4 className="text-lg font-semibold mb-3 text-gray-800">Rate this movie</h4>

                {userRating > 0 && (
                    <div className="text-sm text-blue-600 mb-2 flex items-center justify-center">
                        <span>Your rating: {userRating}/5 stars</span>
                        <button
                            onClick={handleDeleteRating}
                            disabled={isSubmitting}
                            className="ml-2 text-red-500 hover:text-red-700 disabled:opacity-50"
                            title="Delete rating"
                        >
                            ×
                        </button>
                    </div>
                )}

                <div className="flex justify-center space-x-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => handleRatingClick(star)}
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(0)}
                            disabled={isSubmitting}
                            className="p-1 transition-colors duration-200 disabled:opacity-50"
                        >
                            <Star
                                className={`w-8 h-8 ${star <= (hoveredRating || userRating)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                    } hover:text-yellow-400 transition-colors`}
                            />
                        </button>
                    ))}
                </div>

                {isSubmitting && (
                    <p className="text-sm text-blue-600 flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                        {userRating > 0 ? 'Updating rating...' : 'Submitting rating...'}
                    </p>
                )}

                {error && (
                    <p className="text-sm text-red-600 flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
};

// Movie Selector Component
const MovieSelector: React.FC<{ onMovieSelect: (movie: Movie) => void }> = ({ onMovieSelect }) => {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);

    useEffect(() => {
        fetchMovies();
    }, []);

    const fetchMovies = async () => {
        try {
            setLoading(true);
            const data = await api.getMovies();
            setMovies(data);
        } catch (err) {
            console.error('Error fetching movies:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            fetchMovies();
            return;
        }

        try {
            setSearchLoading(true);
            const data = await api.searchMovies(query);
            setMovies(data);
        } catch (err) {
            console.error('Error searching movies:', err);
        } finally {
            setSearchLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Select a Movie to Rate</h2>
                <input
                    type="text"
                    placeholder="Search movies..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
            </div>

            {(loading || searchLoading) ? (
                <div className="flex justify-center py-8">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {movies.slice(0, 12).map((movie) => (
                        <div
                            key={movie.id}
                            onClick={() => onMovieSelect(movie)}
                            className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                        >
                            <Image
                                src={movie.imageUrl || '/api/placeholder/200/300'}
                                alt={movie.title}
                                width={200}
                                height={300}
                                className="w-full h-48 object-cover"
                            />
                            <div className="p-3">
                                <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 mb-1">
                                    {movie.title}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {movie.category.name} • {new Date(movie.releaseDate).getFullYear()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Main Rate Movies Page Component
export default function RateMoviesPage() {
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

    const handleMovieSelect = (movie: Movie) => {
        setSelectedMovie(movie);
    };

    const handleRatingSubmit = (movieId: string, rating: number) => {
        console.log(`Movie ${movieId} rated ${rating} stars`);
        // Show success message or redirect
        setTimeout(() => {
            // Reset to movie selection after rating
            setSelectedMovie(null);
        }, 2000);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-md">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center space-x-2">
                            <Film className="w-8 h-8 text-blue-600" />
                            <h1 className="text-2xl font-bold text-gray-900">MovieApp</h1>
                        </Link>

                        <div className="flex items-center space-x-4">
                            <Link
                                href="/"
                                className="text-gray-600 hover:text-blue-600 transition-colors"
                            >
                                Home
                            </Link>
                            <Link
                                href="/recommendations"
                                className="text-gray-600 hover:text-blue-600 transition-colors"
                            >
                                Recommendations
                            </Link>
                            <span className="text-blue-600 font-medium">
                                Rate Movies
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                {!selectedMovie ? (
                    <MovieSelector onMovieSelect={handleMovieSelect} />
                ) : (
                    <div className="max-w-md mx-auto">
                        <button
                            onClick={() => setSelectedMovie(null)}
                            className="mb-6 flex items-center text-blue-600 hover:text-blue-800 text-sm transition-colors"
                        >
                            ← Back to movie selection
                        </button>
                        <RateMovie
                            movie={selectedMovie}
                            onRatingSubmit={handleRatingSubmit}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}