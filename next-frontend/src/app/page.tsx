//E:\EntryLevelExam\next-frontend\src\app\page.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext'; // Add this import
import {
  Calendar,
  Film,
  Grid3X3,
  Heart,
  Search,
  Star,
  TrendingUp,
  User
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Type definitions
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
  userRating?: number;
  averageRating?: number;
  totalRatings?: number;
  createdAt: string;
  updatedAt: string;
}

// API Configuration - FIXED: Use same URL as AuthContext
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// These helper functions should be here:
const getImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) return '/api/placeholder/300/400';

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  if (imageUrl.startsWith('/')) {
    return `${API_BASE_URL}${imageUrl}`;
  }

  return `${API_BASE_URL}/${imageUrl}`;
};

const getUserAvatarUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) return '/api/placeholder/32/32';

  // Add cache-busting parameter
  const timestamp = new Date().getTime();

  if (imageUrl.startsWith('http')) {
    return `${imageUrl}?ts=${timestamp}`;
  }

  return `${API_BASE_URL}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}?ts=${timestamp}`;
};

// API utility functions
const getAuthHeaders = () => {
  // FIXED: Use 'access_token' instead of 'token' to match AuthContext
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    }
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
};

// Real API functions
const api = {
  async getAllMovies(): Promise<Movie[]> {
    return apiCall('/movies');
  },

  async getMovieAverageRating(movieId: string): Promise<{ average: number; count: number }> {
    return apiCall(`/ratings/movie/${movieId}/average`);
  },

  async searchMovies(query: string): Promise<Movie[]> {
    try {
      const movies = await this.getAllMovies();

      // Filter movies based on search query
      const filteredMovies = movies.filter(movie =>
        movie.title.toLowerCase().includes(query.toLowerCase()) ||
        movie.description.toLowerCase().includes(query.toLowerCase()) ||
        movie.category.name.toLowerCase().includes(query.toLowerCase())
      );

      // Fetch ratings for filtered movies
      const moviesWithRatings = await Promise.all(
        filteredMovies.map(async (movie) => {
          try {
            const rating = await this.getMovieAverageRating(movie.id);
            return {
              ...movie,
              averageRating: rating.average,
              totalRatings: rating.count
            };
          } catch (error) {
            console.error(`Error fetching rating for movie ${movie.id}:`, error);
            return movie;
          }
        })
      );

      return moviesWithRatings;
    } catch (error) {
      console.error('Error searching movies:', error);
      return [];
    }
  },

  async getRecentMovies(): Promise<Movie[]> {
    try {
      const movies = await this.getAllMovies();

      // Sort by release date (newest first) and take first 8
      const recentMovies = movies
        .sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime())
        .slice(0, 8);

      // Fetch ratings for each movie
      const moviesWithRatings = await Promise.all(
        recentMovies.map(async (movie) => {
          try {
            const rating = await this.getMovieAverageRating(movie.id);
            return {
              ...movie,
              averageRating: rating.average,
              totalRatings: rating.count
            };
          } catch (error) {
            console.error(`Error fetching rating for movie ${movie.id}:`, error);
            return movie;
          }
        })
      );

      return moviesWithRatings;
    } catch (error) {
      console.error('Error fetching recent movies:', error);
      return [];
    }
  },

  async getTopRatedMovies(): Promise<Movie[]> {
    try {
      const movies = await this.getAllMovies();

      // Fetch ratings for all movies
      const moviesWithRatings = await Promise.all(
        movies.map(async (movie) => {
          try {
            const rating = await this.getMovieAverageRating(movie.id);
            return {
              ...movie,
              averageRating: rating.average,
              totalRatings: rating.count
            };
          } catch (error) {
            console.error(`Error fetching rating for movie ${movie.id}:`, error);
            return {
              ...movie,
              averageRating: 0,
              totalRatings: 0
            };
          }
        })
      );

      // Filter movies with ratings and sort by average rating (highest first)
      // Take top 8 movies
      const topRatedMovies = moviesWithRatings
        .filter(movie => movie.totalRatings && movie.totalRatings > 0)
        .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
        .slice(0, 8);

      return topRatedMovies;
    } catch (error) {
      console.error('Error fetching top rated movies:', error);
      return [];
    }
  },

  async getCategories(): Promise<Category[]> {
    try {
      const movies = await this.getAllMovies();

      // Extract unique categories from movies
      const categoriesMap = new Map<string, Category>();
      movies.forEach(movie => {
        if (movie.category && !categoriesMap.has(movie.category.id)) {
          categoriesMap.set(movie.category.id, movie.category);
        }
      });

      return Array.from(categoriesMap.values());
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  },

  async getMoviesByCategory(categoryId: string): Promise<Movie[]> {
    try {
      const movies = await this.getAllMovies();

      // Filter movies by category
      const categoryMovies = movies.filter(movie => movie.category.id === categoryId);

      // Fetch ratings for each movie
      const moviesWithRatings = await Promise.all(
        categoryMovies.map(async (movie) => {
          try {
            const rating = await this.getMovieAverageRating(movie.id);
            return {
              ...movie,
              averageRating: rating.average,
              totalRatings: rating.count
            };
          } catch (error) {
            console.error(`Error fetching rating for movie ${movie.id}:`, error);
            return movie;
          }
        })
      );

      return moviesWithRatings;
    } catch (error) {
      console.error('Error fetching movies by category:', error);
      return [];
    }
  }
};

export default function Home() {
  // Use AuthContext instead of managing user state locally
  const { user, logout } = useAuth();
  const router = useRouter();

  const [recentMovies, setRecentMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryMovies, setCategoryMovies] = useState<Movie[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [recent, topRated, categories] = await Promise.all([
        api.getRecentMovies(),
        api.getTopRatedMovies(),
        api.getCategories()
      ]);

      setRecentMovies(recent);
      setTopRatedMovies(topRated);
      setCategories(categories);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load movie data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = async (categoryId: string) => {
    try {
      setCategoryLoading(true);
      setSelectedCategory(categoryId);
      setShowSearchResults(false); // Hide search results when browsing categories

      const movies = await api.getMoviesByCategory(categoryId);
      setCategoryMovies(movies);
    } catch (error) {
      console.error('Error loading category movies:', error);
      setError('Failed to load category movies. Please try again later.');
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setIsSearching(true);
      setShowSearchResults(true);
      setSelectedCategory(null); // Clear category selection when searching

      const results = await api.searchMovies(searchQuery.trim());
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching movies:', error);
      setError('Failed to search movies. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const handleLogout = () => {
    logout(); // Use the logout function from AuthContext
  };

  // Updated MovieCard component with better image handling
  const MovieCard = ({ movie }: { movie: Movie }) => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group">
      <div className="relative aspect-[2/3] bg-gray-200 overflow-hidden">
        <img
          src={getImageUrl(movie.imageUrl)}
          alt={movie.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            // Fallback to placeholder if image fails to load
            e.currentTarget.src = '/api/placeholder/300/450';
          }}
        />
        <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs font-medium">
          {movie.category.name}
        </div>
        {/* Optional: Add a gradient overlay for better text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>

      <div className="p-4">
        <h3 className="font-bold text-lg mb-2 line-clamp-1 group-hover:text-blue-600 transition-colors">
          {movie.title}
        </h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2 leading-relaxed">
          {movie.description}
        </p>

        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            <span>{new Date(movie.releaseDate).getFullYear()}</span>
          </div>
          {movie.averageRating && movie.totalRatings && movie.totalRatings > 0 && (
            <div className="flex items-center bg-yellow-50 px-2 py-1 rounded">
              <Star className="w-4 h-4 mr-1 text-yellow-500 fill-current" />
              <span className="font-medium">{movie.averageRating.toFixed(1)}</span>
              <span className="ml-1 text-gray-400">({movie.totalRatings})</span>
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <Link
            href={`/movie/${movie.id}`}
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

  const CategoryCard = ({ category }: { category: Category }) => (
    <button
      onClick={() => handleCategoryClick(category.id)}
      className={`p-6 rounded-lg text-left transition-all hover:shadow-lg ${selectedCategory === category.id
        ? 'bg-blue-600 text-white shadow-lg'
        : 'bg-white text-gray-900 hover:bg-gray-50'
        }`}
    >
      <div className="flex items-center space-x-3">
        <Grid3X3 className="w-8 h-8" />
        <div>
          <h3 className="text-xl font-semibold">{category.name}</h3>
          {category.description && (
            <p className={`text-sm mt-1 ${selectedCategory === category.id ? 'text-blue-100' : 'text-gray-600'
              }`}>
              {category.description}
            </p>
          )}
        </div>
      </div>
    </button>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your movie experience...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Film className="w-12 h-12 mx-auto mb-2" />
            <p className="text-lg font-semibold">Oops! Something went wrong</p>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
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
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <Film className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">MovieApp</h1>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="flex-1 max-w-md mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search movies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {showSearchResults && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </form>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-3">
                  <Link
                    href="/recommendations"
                    className="text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    For You
                  </Link>
                  <Link
                    href="/profile"
                    className="flex items-center space-x-2 text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    {user.imageUrl ? (
                      <img
                        src={getUserAvatarUrl(user.imageUrl)}
                        alt={user.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-500 text-white text-lg font-bold">
                        {user?.name?.charAt(0)?.toUpperCase()}
                      </span>
                    )}
                    <span>{user.name}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/auth/signin"
                    className="text-gray-700 hover:text-blue-600 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Only show when not searching */}
      {!showSearchResults && (
        <section className="bg-gradient-to-r from-blue-600 to-purple-700 text-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl md:text-6xl font-bold mb-4">
              Discover Amazing Movies
            </h2>
            <p className="text-xl md:text-2xl mb-8 opacity-90">
              Rate, review, and get personalized recommendations
            </p>
            {user ? (
              <div className="flex justify-center space-x-4">
                <Link
                  href="/recommendations"
                  className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
                >
                  View My Recommendations
                </Link>
                <Link
                  href="/movie/rate"
                  className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
                >
                  Browse All Movies
                </Link>
              </div>
            ) : (
              <Link
                href="/auth/signup"
                className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-block"
              >
                Get Started Today
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search Results Section */}
        {showSearchResults && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">
                Search Results for "{searchQuery}"
              </h2>
              <button
                onClick={clearSearch}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear Search
              </button>
            </div>

            {isSearching ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Searching movies...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {searchResults.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No movies found matching "{searchQuery}".</p>
                <p className="text-sm mt-2">Try searching with different keywords.</p>
              </div>
            )}
          </section>
        )}

        {/* Quick Actions - Only show when not searching */}
        {!showSearchResults && user && (
          <section className="mb-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link
                href="/recommendations"
                className="bg-gradient-to-r from-green-400 to-blue-500 text-white p-6 rounded-lg hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-8 h-8" />
                  <div>
                    <h3 className="text-xl font-semibold">For You</h3>
                    <p className="opacity-90">Personalized recommendations</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/movie/rate"
                className="bg-gradient-to-r from-purple-400 to-pink-500 text-white p-6 rounded-lg hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center space-x-3">
                  <Star className="w-8 h-8" />
                  <div>
                    <h3 className="text-xl font-semibold">Rate Movies</h3>
                    <p className="opacity-90">Share your opinions</p>
                  </div>
                </div>
              </Link>

              <Link
                href="/profile"
                className="bg-gradient-to-r from-orange-400 to-red-500 text-white p-6 rounded-lg hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center space-x-3">
                  <User className="w-8 h-8" />
                  <div>
                    <h3 className="text-xl font-semibold">My Profile</h3>
                    <p className="opacity-90">Manage your account</p>
                  </div>
                </div>
              </Link>
            </div>
          </section>
        )}

        {/* Categories Section - Only show when not searching */}
        {!showSearchResults && (
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Browse by Category</h2>

            {categories.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
                  {categories.map((category) => (
                    <CategoryCard key={category.id} category={category} />
                  ))}
                </div>

                {/* Clear Selection Button */}
                {selectedCategory && (
                  <div className="flex justify-center mb-6">
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setCategoryMovies([]);
                      }}
                      className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Clear Selection
                    </button>
                  </div>
                )}

                {/* Category Movies */}
                {selectedCategory && (
                  <div className="mt-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-6">
                      {categories.find(c => c.id === selectedCategory)?.name} Movies
                    </h3>

                    {categoryLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading category movies...</p>
                      </div>
                    ) : categoryMovies.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {categoryMovies.map((movie) => (
                          <MovieCard key={movie.id} movie={movie} />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Film className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No movies found in this category.</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Grid3X3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No categories found.</p>
              </div>
            )}
          </section>
        )}

        {/* Recent Movies - Only show when not searching */}
        {!showSearchResults && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Latest Releases</h2>
              <Link
                href="/movie/rate"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View All →
              </Link>
            </div>

            {recentMovies.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {recentMovies.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Film className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No recent movies found.</p>
              </div>
            )}
          </section>
        )}

        {/* Top Rated Movies - Only show when not searching */}
        {!showSearchResults && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-gray-900">Top Rated</h2>
              <Link
                href="/movie/rate"
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View All →
              </Link>
            </div>

            {topRatedMovies.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {topRatedMovies.map((movie) => (
                  <MovieCard key={movie.id} movie={movie} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No rated movies found yet.</p>
              </div>
            )}
          </section>
        )}

        {/* Features Section - Only show when not searching */}
        {!showSearchResults && (
          <section className="bg-white rounded-lg p-8 shadow-md">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
              Why Choose MovieApp?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Smart Recommendations</h3>
                <p className="text-gray-600">
                  Get personalized movie suggestions based on your ratings and preferences.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Rate & Review</h3>
                <p className="text-gray-600">
                  Share your thoughts and help others discover great movies.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Film className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Vast Collection</h3>
                <p className="text-gray-600">
                  Explore thousands of movies across all genres and time periods.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Film className="w-8 h-8 text-blue-400" />
                <h3 className="text-xl font-bold">MovieApp</h3>
              </div>
              <p className="text-gray-400">
                Your ultimate destination for movie discovery and recommendations.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/recommendations" className="hover:text-white">Recommendations</Link></li>
                <li><Link href="/movie/rate" className="hover:text-white">Browse Movies</Link></li>
                <li><Link href="/movie/rate" className="hover:text-white">Rate Movies</Link></li>
                <li><Link href="/profile" className="hover:text-white">My Profile</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
                <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-lg font-semibold mb-4">Connect</h4>
              <p className="text-gray-400 mb-4">
                Stay updated with the latest movies and features.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white">Twitter</a>
                <a href="#" className="text-gray-400 hover:text-white">Facebook</a>
                <a href="#" className="text-gray-400 hover:text-white">Instagram</a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 mt-8 text-center text-gray-400">
            <p>&copy; 2025 MovieApp. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}