'use client';

import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface Category {
    _id: string;  // Backend uses _id for categories
    id?: string;  // Some endpoints might return id
    name: string;
    description?: string;
}

interface UserProfile {
    _id: string;
    id?: string;
    name: string;
    email: string;
    address?: string;
    dob?: string;
    imageUrl?: string;
    categories: (string | Category)[]; // Can be IDs or populated objects
}

interface UpdateProfileData {
    name: string;
    address?: string;
    dob?: string;
    categories: string[]; // Always send as MongoDB IDs
}

export default function Profile() {
    const { updateUser } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState<UpdateProfileData>({
        name: '',
        address: '',
        dob: '',
        categories: []
    });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // Helper function to get the full image URL
    const getImageUrl = (imageUrl: string) => {
        if (!imageUrl) return '';

        // If imageUrl is already a full URL, return it as is
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
            return imageUrl;
        }

        // If it's a relative path, prepend the backend URL
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        return `${backendUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
    };

    // Helper function to get category ID (handles both _id and id fields)
    const getCategoryId = (category: Category): string => {
        return category._id || category.id || '';
    };

    // Helper function to extract category IDs from profile
    const extractCategoryIds = (profileCategories: (string | Category)[]): string[] => {
        return profileCategories.map(cat => {
            if (typeof cat === 'string') {
                return cat;
            }
            return getCategoryId(cat);
        });
    };

    // Check authentication
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (!token) {
            router.push('/auth/signin');
            return;
        }
    }, [router]);

    // Fetch profile and categories data
    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('access_token');
            if (!token) return;

            try {
                setLoading(true);

                // Fetch user profile
                const profileResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!profileResponse.ok) {
                    throw new Error('Failed to fetch profile');
                }

                const profileData = await profileResponse.json();
                setProfile(profileData);

                // Extract category IDs for form data
                const categoryIds = extractCategoryIds(profileData.categories || []);

                // Set form data
                setFormData({
                    name: profileData.name || '',
                    address: profileData.address || '',
                    dob: profileData.dob ? profileData.dob.split('T')[0] : '', // Format date for input
                    categories: categoryIds
                });

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

                // Transform categories to ensure _id field exists
                const transformedCategories = categoriesData.map((cat: any) => ({
                    ...cat,
                    _id: cat._id || cat.id // Ensure _id exists, fallback to id if needed
                }));

                setCategories(transformedCategories);

            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCategoryChange = (categoryId: string, checked: boolean) => {
        setFormData(prev => ({
            ...prev,
            categories: checked
                ? [...prev.categories, categoryId]
                : prev.categories.filter(id => id !== categoryId)
        }));
    };

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            setError('File size must be less than 5MB');
            return;
        }

        const token = localStorage.getItem('access_token');
        if (!token) return;

        setImageUploading(true);
        setError('');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me/avatar`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to upload image');
            }

            const updatedProfile = await response.json();
            setProfile(updatedProfile);
            setSuccess('Profile picture updated successfully!');
            updateUser({ imageUrl: updatedProfile.imageUrl });

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload image');
        } finally {
            setImageUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdateLoading(true);
        setError('');
        setSuccess('');

        const token = localStorage.getItem('access_token');
        if (!token) return;

        try {
            // Prepare the data to send - ensure categories are MongoDB IDs
            const updateData = {
                ...formData,
                categories: formData.categories // These should already be MongoDB _id values
            };

            console.log('Sending update data:', updateData); // Debug log

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/me`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Update error:', errorData); // Debug log
                throw new Error(errorData.message || 'Failed to update profile');
            }

            const updatedProfile = await response.json();
            setProfile(updatedProfile);
            setIsEditing(false);
            setSuccess('Profile updated successfully!');
            updateUser({
                name: updatedProfile.name,
                address: updatedProfile.address,
                dob: updatedProfile.dob,
                categories: updatedProfile.categories
            });

            // Update localStorage user data
            const userData = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({
                ...userData,
                name: updatedProfile.name
            }));

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleCancel = () => {
        if (profile) {
            const categoryIds = extractCategoryIds(profile.categories || []);
            setFormData({
                name: profile.name || '',
                address: profile.address || '',
                dob: profile.dob ? profile.dob.split('T')[0] : '',
                categories: categoryIds
            });
        }
        setIsEditing(false);
        setError('');
        setSuccess('');
    };

    const getCategoryNames = (profileCategories: (string | Category)[]): string => {
        const categoryIds = extractCategoryIds(profileCategories);
        return categories
            .filter(cat => categoryIds.includes(getCategoryId(cat)))
            .map(cat => cat.name)
            .join(', ');
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'Not provided';
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
                    <p className="mt-4 text-gray-600">Loading profile...</p>
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
                            <button
                                onClick={() => router.push('/')}
                                className="text-indigo-600 hover:text-indigo-500 mr-4"
                            >
                                ← Back to Home
                            </button>
                            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">

                    {/* Success/Error Messages */}
                    {success && (
                        <div className="mb-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                            {success}
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                            {error}
                        </div>
                    )}

                    {/* Profile Card */}
                    <div className="bg-white shadow rounded-lg">
                        <div className="px-6 py-8">

                            {/* Profile Header */}
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center space-x-4">
                                    {/* Profile Picture */}
                                    <div className="relative">
                                        <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                            {profile?.imageUrl ? (
                                                <Image
                                                    src={getImageUrl(profile.imageUrl)}
                                                    alt="Profile"
                                                    width={80}
                                                    height={80}
                                                    className="h-20 w-20 rounded-full object-cover"
                                                    unoptimized={true} // Disable optimization for external images
                                                />
                                            ) : (
                                                <span className="text-white text-2xl font-bold">
                                                    {profile?.name.charAt(0).toUpperCase()}
                                                </span>
                                            )}
                                        </div>

                                        {/* Camera Icon for Image Upload - Only show in edit mode */}
                                        {isEditing && (
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={imageUploading}
                                                className="absolute -bottom-1 -right-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-2 shadow-lg disabled:opacity-50"
                                                title="Change profile picture"
                                            >
                                                {imageUploading ? (
                                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                                                ) : (
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                )}
                                            </button>
                                        )}

                                        {/* Hidden File Input */}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                        />
                                    </div>

                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">{profile?.name}</h2>
                                        <p className="text-gray-600">{profile?.email}</p>
                                    </div>
                                </div>

                                {!isEditing && (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                                    >
                                        Edit Profile
                                    </button>
                                )}
                            </div>

                            {/* Profile Content */}
                            {isEditing ? (
                                // Edit Form
                                <form onSubmit={handleUpdateProfile} className="space-y-6">

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        {/* Name */}
                                        <div>
                                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                                Full Name
                                            </label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                required
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>

                                        {/* Date of Birth */}
                                        <div>
                                            <label htmlFor="dob" className="block text-sm font-medium text-gray-700">
                                                Date of Birth
                                            </label>
                                            <input
                                                type="date"
                                                id="dob"
                                                name="dob"
                                                value={formData.dob}
                                                onChange={handleInputChange}
                                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Address */}
                                    <div>
                                        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                                            Address
                                        </label>
                                        <input
                                            type="text"
                                            id="address"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleInputChange}
                                            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                        />
                                    </div>

                                    {/* Favorite Categories */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-3">
                                            Favorite Categories
                                        </label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {categories.map((category) => {
                                                const categoryId = getCategoryId(category);
                                                return (
                                                    <label key={categoryId} className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.categories.includes(categoryId)}
                                                            onChange={(e) => handleCategoryChange(categoryId, e.target.checked)}
                                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                        />
                                                        <span className="ml-2 text-sm text-gray-700">{category.name}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Form Actions */}
                                    <div className="flex justify-end space-x-3">
                                        <button
                                            type="button"
                                            onClick={handleCancel}
                                            className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={updateLoading || imageUploading}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                                        >
                                            {updateLoading ? 'Updating...' : 'Update Profile'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                // View Mode
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                        {/* Email */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500">Email</label>
                                            <p className="mt-1 text-sm text-gray-900">{profile?.email}</p>
                                        </div>

                                        {/* Date of Birth */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-500">Date of Birth</label>
                                            <p className="mt-1 text-sm text-gray-900">{formatDate(profile?.dob || '')}</p>
                                        </div>
                                    </div>

                                    {/* Address */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500">Address</label>
                                        <p className="mt-1 text-sm text-gray-900">{profile?.address || 'Not provided'}</p>
                                    </div>

                                    {/* Favorite Categories */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-500">Favorite Categories</label>
                                        <div className="mt-2">
                                            {profile?.categories && profile.categories.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {profile.categories.map((cat) => {
                                                        const categoryId = typeof cat === 'string' ? cat : getCategoryId(cat);
                                                        const category = categories.find(c => getCategoryId(c) === categoryId);
                                                        const displayName = typeof cat === 'object' ? cat.name : (category?.name || 'Unknown');

                                                        return (
                                                            <span
                                                                key={categoryId}
                                                                className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm"
                                                            >
                                                                {displayName}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <p className="text-sm text-gray-900">No favorite categories selected</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}