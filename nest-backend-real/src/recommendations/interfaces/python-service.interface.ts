// interfaces/python-service.interface.ts

export interface PythonRecommendationRequest {
    userId: string;
    limit?: number;
    type?: 'collaborative' | 'content' | 'hybrid';
}

export interface PythonRecommendationResponse {
    recommendations: PythonRecommendationItem[];
    userId: string;
    algorithm?: string;
    generatedAt: string;
}

export interface PythonRecommendationItem {
    movieId: string;
    score: number;
}

export interface PythonHealthResponse {
    status: string;
    timestamp: string;
    data_status: {
        ratings_count: number;
        movies_count: number;
        last_update: string | null;
    };
}

export interface PythonStatsResponse {
    total_ratings: number;
    total_movies: number;
    unique_users: number;
    rating_distribution: Record<number, number>;
    average_rating: number;
}