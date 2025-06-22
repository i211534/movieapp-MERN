'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
}

interface User {
    id: string;
    name: string;
    email: string;
}

export default function Movies() {
    const [movies, setMovies] = useState<Movie[]>([]);
    const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();

    // Check authentication and get user data
    useEffect(() => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token) {
            router.push('/auth/signin');
            return;
        }

        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, [router]);

    // Fetch movies and categories
    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                setLoading(true);

                // Fetch movies
                const moviesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/movies`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!moviesResponse.ok) {
                    throw new Error('Failed to fetch movies');
                }

                const moviesData = await moviesResponse.json();
                setMovies(moviesData);
                setFilteredMovies(moviesData);

                // Fetch categories
                const categoriesResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/categories`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!categoriesResponse.ok) {
                    throw new Error('Failed to fetch categories');
                }

                const categoriesData = await categoriesResponse.json();
                setCategories(categoriesData);

            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Live search functionality
    useEffect(() => {
        const performSearch = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            try {
                if (searchQuery.trim()) {
                    // Use live search API endpoint
                    const response = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/movies/search?q=${encodeURIComponent(searchQuery)}`,
                        {
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json',
                            },
                        }
                    );

                    if (response.ok) {
                        const searchResults = await response.json();
                        let filtered = searchResults;

                        // Filter by category if selected
                        if (selectedCategory !== 'all') {
                            filtered = filtered.filter((movie: Movie) => movie.category._id === selectedCategory);
                        }

                        setFilteredMovies(filtered);
                    }
                } else {
                    // If no search query, show all movies with category filter
                    let filtered = movies;
                    if (selectedCategory !== 'all') {
                        filtered = filtered.filter(movie => movie.category._id === selectedCategory);
                    }
                    setFilteredMovies(filtered);
                }
            } catch (err) {
                console.error('Search error:', err);
                // Fallback to local filtering if search API fails
                let filtered = movies;
                if (searchQuery.trim()) {
                    filtered = filtered.filter(movie =>
                        movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        movie.description.toLowerCase().includes(searchQuery.toLowerCase())
                    );
                }
                if (selectedCategory !== 'all') {
                    filtered = filtered.filter(movie => movie.category._id === selectedCategory);
                }
                setFilteredMovies(filtered);
            }
        };

        // Debounce search to avoid too many API calls
        const timeoutId = setTimeout(performSearch, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, selectedCategory, movies]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/auth/signin');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
                    <p className="mt-4 text-gray-600">Loading movies...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div className="flex items-center">
                            <h1 className="text-3xl font-bold text-gray-900">MovieApp</h1>
                        </div>

                        <div className="flex items-center space-x-4">
                            {user && (
                                <span className="text-gray-700">Welcome, {user.name}!</span>
                            )}
                            <button
                                onClick={() => router.push('/profile')}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                                My Profile
                            </button>
                            <button
                                onClick={handleLogout}
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">

                    {/* Search and Filter Controls */}
                    <div className="mb-8 bg-white p-6 rounded-lg shadow">
                        <div className="flex flex-col md:flex-row gap-4">
                            {/* Search Input */}
                            <div className="flex-1">
                                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                                    Search Movies
                                </label>
                                <input
                                    type="text"
                                    id="search"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by title or description..."
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            {/* Category Filter */}
                            <div className="md:w-64">
                                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                                    Filter by Category
                                </label>
                                <select
                                    id="category"
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="all">All Categories</option>
                                    {categories.map((category) => (
                                        <option key={category._id} value={category._id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {/* Movies Grid */}
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">
                                Movies ({filteredMovies.length})
                            </h2>
                        </div>

                        {filteredMovies.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-gray-500 text-lg">
                                    {searchQuery || selectedCategory !== 'all'
                                        ? 'No movies found matching your criteria.'
                                        : 'No movies available.'
                                    }
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredMovies.map((movie) => (
                                    <div key={movie._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                                        {/* Movie Poster Placeholder */}
                                        <div className="h-64 bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                            {movie.imageUrl ? (
                                                <Image
                                                    src={movie.imageUrl}
                                                    alt={movie.title}
                                                    width={300}
                                                    height={400}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="text-white text-4xl font-bold opacity-50">
                                                    🎬
                                                </div>
                                            )}
                                        </div>

                                        {/* Movie Details */}
                                        <div className="p-4">
                                            <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-1">
                                                {movie.title}
                                            </h3>

                                            <p className="text-gray-600 text-sm mb-3 line-clamp-3">
                                                {movie.description}
                                            </p>

                                            <div className="flex justify-between items-center text-sm">
                                                <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded-full">
                                                    {movie.category.name}
                                                </span>
                                                <span className="text-gray-500">
                                                    {formatDate(movie.releaseDate)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}