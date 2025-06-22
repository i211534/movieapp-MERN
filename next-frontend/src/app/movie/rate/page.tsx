'use client';

import { AlertCircle, Calendar, Film, Heart, RefreshCw, Star } from 'lucide-react';
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

// Image utility function
const getImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return '/api/placeholder/300/450';
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${API_BASE_URL}${imageUrl}`;
};

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

// Rate Movie Component with improved image handling
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
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
                <div className="animate-pulse">
                    <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6 mb-6">
                        <div className="w-full sm:w-32 h-48 bg-gray-300 rounded mx-auto sm:mx-0"></div>
                        <div className="flex-1 w-full">
                            <div className="h-6 bg-gray-300 rounded mb-3"></div>
                            <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                        </div>
                    </div>
                    <div className="h-4 bg-gray-300 rounded mb-2"></div>
                    <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start space-y-4 sm:space-y-0 sm:space-x-6 mb-6">
                <div className="relative w-full sm:w-32 h-48 bg-gray-200 rounded overflow-hidden mx-auto sm:mx-0 flex-shrink-0">
                    <img
                        src={getImageUrl(movie?.imageUrl)}
                        alt={movie?.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.currentTarget.src = '/api/placeholder/300/450';
                        }}
                    />
                    <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                        {movie?.category?.name}
                    </div>
                </div>
                <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{movie?.title}</h3>
                    <div className="flex items-center justify-center sm:justify-start text-gray-500 text-sm mb-3">
                        <Calendar className="w-4 h-4 mr-1" />
                        <span>{new Date(movie?.releaseDate).getFullYear()}</span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{movie?.description}</p>
                </div>
            </div>

            <div className="text-center border-t pt-6">
                <h4 className="text-xl font-semibold mb-4 text-gray-800">Rate this movie</h4>

                {userRating > 0 && (
                    <div className="text-sm text-blue-600 mb-3 flex items-center justify-center bg-blue-50 rounded-lg py-2 px-4">
                        <span>Your rating: {userRating}/5 stars</span>
                        <button
                            onClick={handleDeleteRating}
                            disabled={isSubmitting}
                            className="ml-3 text-red-500 hover:text-red-700 disabled:opacity-50 font-bold text-lg"
                            title="Delete rating"
                        >
                            ×
                        </button>
                    </div>
                )}

                <div className="flex justify-center space-x-2 mb-6">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => handleRatingClick(star)}
                            onMouseEnter={() => setHoveredRating(star)}
                            onMouseLeave={() => setHoveredRating(0)}
                            disabled={isSubmitting}
                            className="p-2 transition-all duration-200 disabled:opacity-50 hover:scale-110"
                        >
                            <Star
                                className={`w-10 h-10 ${star <= (hoveredRating || userRating)
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300'
                                    } hover:text-yellow-400 transition-colors`}
                            />
                        </button>
                    ))}
                </div>

                {isSubmitting && (
                    <p className="text-sm text-blue-600 flex items-center justify-center bg-blue-50 rounded-lg py-2 px-4">
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        {userRating > 0 ? 'Updating rating...' : 'Submitting rating...'}
                    </p>
                )}

                {error && (
                    <p className="text-sm text-red-600 flex items-center justify-center bg-red-50 rounded-lg py-2 px-4">
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {error}
                    </p>
                )}
            </div>
        </div>
    );
};

// Updated MovieCard component with better image handling
const MovieCard = ({ movie, onMovieSelect }: { movie: Movie; onMovieSelect: (movie: Movie) => void }) => (
    <div
        onClick={() => onMovieSelect(movie)}
        className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer"
    >
        <div className="relative aspect-[2/3] bg-gray-200 overflow-hidden">
            <img
                src={getImageUrl(movie.imageUrl)}
                alt={movie.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                    e.currentTarget.src = '/api/placeholder/300/450';
                }}
            />
            <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium">
                {movie.category.name}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
        <div className="p-4">
            <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
                {movie.title}
            </h3>
            <p className="text-gray-600 text-sm mb-3 line-clamp-2 leading-relaxed">
                {movie.description}
            </p>
            <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    <span>{new Date(movie.releaseDate).getFullYear()}</span>
                </div>
                <button className="p-1 border border-gray-300 rounded hover:bg-gray-50 hover:border-red-300 transition-colors group/heart">
                    <Heart className="w-4 h-4 group-hover/heart:text-red-500 transition-colors" />
                </button>
            </div>
        </div>
    </div>
);

// Movie Selector Component with improved layout
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
        <div className="max-w-7xl mx-auto p-6">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">Select a Movie to Rate</h2>
                <div className="max-w-md mx-auto">
                    <input
                        type="text"
                        placeholder="Search movies..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                    />
                </div>
            </div>

            {(loading || searchLoading) ? (
                <div className="flex justify-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {movies.slice(0, 15).map((movie) => (
                        <MovieCard
                            key={movie.id}
                            movie={movie}
                            onMovieSelect={onMovieSelect}
                        />
                    ))}
                </div>
            )}

            {!loading && !searchLoading && movies.length === 0 && (
                <div className="text-center py-12">
                    <Film className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-gray-600 mb-2">No movies found</h3>
                    <p className="text-gray-500">Try adjusting your search terms</p>
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
            <header className="bg-white shadow-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center space-x-2">
                            <Film className="w-8 h-8 text-blue-600" />
                            <h1 className="text-2xl font-bold text-gray-900">MovieApp</h1>
                        </Link>

                        <nav className="hidden md:flex items-center space-x-6">
                            <Link
                                href="/"
                                className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
                            >
                                Home
                            </Link>
                            <Link
                                href="/recommendations"
                                className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
                            >
                                Recommendations
                            </Link>
                            <span className="text-blue-600 font-medium">
                                Rate Movies
                            </span>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                {!selectedMovie ? (
                    <MovieSelector onMovieSelect={handleMovieSelect} />
                ) : (
                    <div className="max-w-2xl mx-auto">
                        <button
                            onClick={() => setSelectedMovie(null)}
                            className="mb-6 flex items-center text-blue-600 hover:text-blue-800 text-sm transition-colors font-medium"
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