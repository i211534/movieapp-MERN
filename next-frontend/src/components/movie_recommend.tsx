//E:\EntryLevelExam\next-frontend\src\components\movie_recommend.tsx
import { AlertCircle, Calendar, Heart, RefreshCw, Star } from 'lucide-react';
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

interface RecommendationItem {
    movie: Movie;
    score: number;
}

interface RecommendationsResponse {
    recommendations: RecommendationItem[];
    totalCount: number;
}

interface RateMovieProps {
    movie: MovieWithRating;
    onRatingSubmit?: (movieId: string, rating: number) => void;
}

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

// API functions matching your controllers
const api = {
    async rateMovie(movieId: string, rating: number): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/ratings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ movieId, score: rating })
        });

        if (!response.ok) {
            throw new Error('Failed to rate movie');
        }

        return response.json();
    },

    async getRecommendations(limit: number = 10): Promise<RecommendationsResponse> {
        const response = await fetch(`${API_BASE_URL}/recommendations?limit=${limit}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch recommendations');
        }

        return response.json();
    },

    async getMovies(): Promise<Movie[]> {
        const response = await fetch(`${API_BASE_URL}/movies`);

        if (!response.ok) {
            throw new Error('Failed to fetch movies');
        }

        return response.json();
    },

    async searchMovies(query: string): Promise<Movie[]> {
        const response = await fetch(`${API_BASE_URL}/movies/search?q=${encodeURIComponent(query)}`);

        if (!response.ok) {
            throw new Error('Failed to search movies');
        }

        return response.json();
    },

    async getMyRatingForMovie(movieId: string): Promise<any> {
        const response = await fetch(`${API_BASE_URL}/ratings/movie/${movieId}/me`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (response.status === 404) {
            return null;
        }

        if (!response.ok) {
            throw new Error('Failed to fetch user rating');
        }

        return response.json();
    },

    async deleteMyRating(movieId: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/ratings/movie/${movieId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        if (!response.ok && response.status !== 404) {
            throw new Error('Failed to delete rating');
        }
    },

    async getRecommendationHealth(): Promise<{ status: string; service: string }> {
        const response = await fetch(`${API_BASE_URL}/recommendations/health`);

        if (!response.ok) {
            throw new Error('Health check failed');
        }

        return response.json();
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
            const rating = await api.getMyRatingForMovie(movie.id);
            setUserRating(rating?.score || 0);
        } catch (err) {
            console.error('Error fetching user rating:', err);
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
                <img
                    src={movie?.imageUrl || '/api/placeholder/80/120'}
                    alt={movie?.title}
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

// Recommendations Component
const Recommendations: React.FC = () => {
    const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [healthStatus, setHealthStatus] = useState<string>('unknown');

    useEffect(() => {
        checkServiceHealth();
        fetchRecommendations();
    }, []);

    const checkServiceHealth = async (): Promise<void> => {
        try {
            const health = await api.getRecommendationHealth();
            setHealthStatus(health.status);
        } catch (err) {
            setHealthStatus('unhealthy');
            console.error('Health check failed:', err);
        }
    };

    const fetchRecommendations = async (): Promise<void> => {
        try {
            setLoading(true);
            setError(null);
            const data = await api.getRecommendations(12);
            setRecommendations(data.recommendations || []);
        } catch (err: any) {
            setError(err.message || 'Failed to load recommendations');
            console.error('Error fetching recommendations:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRatingUpdate = (movieId: string, rating: number): void => {
        // Refresh recommendations when a rating is updated
        fetchRecommendations();
    };

    if (loading) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <div className="flex items-center justify-center h-64">
                    <RefreshCw className="w-12 h-12 animate-spin text-blue-600" />
                    <span className="ml-3 text-gray-600">Loading recommendations...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-6xl mx-auto p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-red-800 mb-2">{error}</p>
                    {healthStatus === 'unhealthy' && (
                        <p className="text-red-600 text-sm mb-4">
                            Recommendation service is currently unavailable
                        </p>
                    )}
                    <button
                        onClick={fetchRecommendations}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">
                            Recommended for You
                        </h1>
                        <p className="text-gray-600">
                            Based on your ratings and preferences, here are movies you might enjoy
                        </p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${healthStatus === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                        <span className="text-sm text-gray-500">
                            Service: {healthStatus}
                        </span>
                    </div>
                </div>
            </div>

            {recommendations.length === 0 ? (
                <div className="text-center py-16">
                    <Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">
                        No recommendations yet
                    </h3>
                    <p className="text-gray-500">
                        Rate some movies to get personalized recommendations
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recommendations.map((item) => (
                        <div key={item.movie.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                            <img
                                src={item.movie.imageUrl || '/api/placeholder/300/400'}
                                alt={item.movie.title}
                                className="w-full h-64 object-cover"
                            />

                            <div className="p-4">
                                <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-1">
                                    {item.movie.title}
                                </h3>

                                <div className="flex items-center text-gray-500 text-sm mb-2">
                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs mr-2">
                                        {item.movie.category?.name}
                                    </span>
                                    <Calendar className="w-4 h-4 mr-1" />
                                    {new Date(item.movie.releaseDate).getFullYear()}
                                </div>

                                <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                    {item.movie.description}
                                </p>

                                {item.score && (
                                    <div className="flex items-center text-sm text-green-600 mb-3">
                                        <Star className="w-4 h-4 mr-1 fill-current" />
                                        <span>{Math.round(item.score * 100)}% match</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center">
                                    <div className="text-sm text-gray-500">
                                        Click to rate
                                    </div>
                                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                        View Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-8 text-center">
                <button
                    onClick={fetchRecommendations}
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center mx-auto"
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Refresh Recommendations
                </button>
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
        <div className="max-w-4xl mx-auto p-6">
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
                            <img
                                src={movie.imageUrl || '/api/placeholder/200/300'}
                                alt={movie.title}
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

// Main App Component
const MovieApp: React.FC = () => {
    const [currentView, setCurrentView] = useState<'recommendations' | 'rate' | 'select'>('recommendations');
    const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);

    const handleMovieSelect = (movie: Movie) => {
        setSelectedMovie(movie);
        setCurrentView('rate');
    };

    const handleRatingSubmit = (movieId: string, rating: number) => {
        console.log(`Movie ${movieId} rated ${rating} stars`);
        // Optionally redirect back to recommendations
        // setCurrentView('recommendations');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-md mb-6">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-gray-800">MovieApp</h1>
                        <div className="flex space-x-4">
                            <button
                                onClick={() => setCurrentView('recommendations')}
                                className={`px-4 py-2 rounded-lg transition-colors ${currentView === 'recommendations'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                Recommendations
                            </button>
                            <button
                                onClick={() => setCurrentView('select')}
                                className={`px-4 py-2 rounded-lg transition-colors ${currentView === 'select' || currentView === 'rate'
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                Rate Movies
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="container mx-auto px-4">
                {currentView === 'recommendations' && <Recommendations />}
                {currentView === 'select' && <MovieSelector onMovieSelect={handleMovieSelect} />}
                {currentView === 'rate' && selectedMovie && (
                    <div className="max-w-md mx-auto mt-8">
                        <button
                            onClick={() => setCurrentView('select')}
                            className="mb-4 text-blue-600 hover:text-blue-800 text-sm"
                        >
                            ← Back to movie selection
                        </button>
                        <RateMovie
                            movie={selectedMovie}
                            onRatingSubmit={handleRatingSubmit}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default MovieApp;