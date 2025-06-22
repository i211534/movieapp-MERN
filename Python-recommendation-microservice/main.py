# main.py
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import numpy as np
import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.feature_extraction.text import TfidfVectorizer
import requests
import os
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Movie Recommendation Service",
    description="Microservice for movie recommendations using collaborative and content-based filtering",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
NEST_BACKEND_URL = os.getenv("NEST_BACKEND_URL", "http://localhost:3001")
MIN_RATINGS_FOR_CF = 5  # Minimum ratings needed for collaborative filtering

# Pydantic models

class RecommendationRequest(BaseModel):
    user_id: str
    limit: Optional[int] = 10
    recommendation_type: Optional[str] = "hybrid"  # collaborative, content, hybrid

class RecommendationItem(BaseModel):
    movieId: str
    score: float    

class RecommendationResponse(BaseModel):
    recommendations: List[RecommendationItem]  # Changed from recommended_movies
    userId: str  # Changed from user_id
    algorithm: str = "hybrid"
    generatedAt: str

class Rating(BaseModel):
    user_id: str
    movie_id: str
    score: float

class Movie(BaseModel):
    id: str
    title: str
    description: str
    category: str
    release_date: str

# In-memory cache for performance
ratings_cache = []
movies_cache = []
last_cache_update = None
CACHE_DURATION = 300  # 5 minutes

class RecommendationEngine:
    def __init__(self):
        self.user_item_matrix = None
        self.movie_features = None
        self.tfidf_vectorizer = None
        self.content_similarity_matrix = None
        
    async def load_data(self):
        """Load ratings and movies data from Nest.js backend"""
        global ratings_cache, movies_cache, last_cache_update
        
        try:
            # Check if cache is still valid
            if (last_cache_update and 
                (datetime.now() - last_cache_update).seconds < CACHE_DURATION):
                return
            
            # Fetch ratings data from the new endpoint
            ratings_response = requests.get(f"{NEST_BACKEND_URL}/ratings/all", timeout=10)
            if ratings_response.status_code == 200:
                ratings_data = ratings_response.json()
                # Transform the data to match our expected format
                ratings_cache = [
                    {
                        "userId": rating["userId"],
                        "movieId": rating["movieId"], 
                        "score": rating["score"]
                    }
                    for rating in ratings_data
                ]
                logger.info(f"Successfully loaded {len(ratings_cache)} ratings from backend")
            else:
                logger.warning(f"Could not fetch ratings from backend (status: {ratings_response.status_code}), using mock data")
                ratings_cache = self._generate_mock_ratings()
            
            # Fetch movies data
            movies_response = requests.get(f"{NEST_BACKEND_URL}/movies", timeout=10)
            if movies_response.status_code == 200:
                movies_data = movies_response.json()
                # Transform the data to match our expected format
                movies_cache = []
                for movie in movies_data:
                    # Handle nested category object or string
                    category_name = "Unknown"
                    if isinstance(movie.get("category"), dict):
                        category_name = movie["category"].get("name", "Unknown")
                    elif isinstance(movie.get("category"), str):
                        category_name = movie["category"]
                    
                    movies_cache.append({
                        "id": movie.get("_id") or movie.get("id"),
                        "title": movie.get("title", ""),
                        "description": movie.get("description", ""),
                        "category": category_name,
                        "releaseDate": movie.get("releaseDate", "")
                    })
                logger.info(f"Successfully loaded {len(movies_cache)} movies from backend")
            else:
                logger.warning(f"Could not fetch movies from backend (status: {movies_response.status_code}), using mock data")
                movies_cache = self._generate_mock_movies()
            
            last_cache_update = datetime.now()
            logger.info(f"Data loaded successfully: {len(ratings_cache)} ratings, {len(movies_cache)} movies")
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error loading data from backend: {e}")
            # Use mock data as fallback
            ratings_cache = self._generate_mock_ratings()
            movies_cache = self._generate_mock_movies()
            logger.info("Using mock data due to network error")
            
        except Exception as e:
            logger.error(f"Unexpected error loading data: {e}")
            # Use mock data as fallback
            ratings_cache = self._generate_mock_ratings()
            movies_cache = self._generate_mock_movies()
            logger.info("Using mock data due to unexpected error")
    
    def _generate_mock_ratings(self):
        """Generate mock ratings data for testing"""
        mock_ratings = []
        users = [f"user_{i}" for i in range(1, 21)]
        movies = [f"movie_{i}" for i in range(1, 51)]
        
        np.random.seed(42)
        for user in users:
            # Each user rates 10-30 movies
            num_ratings = np.random.randint(10, 31)
            user_movies = np.random.choice(movies, num_ratings, replace=False)
            for movie in user_movies:
                rating = np.random.choice([1, 2, 3, 4, 5], p=[0.1, 0.1, 0.2, 0.3, 0.3])
                mock_ratings.append({
                    "userId": user,
                    "movieId": movie,
                    "score": rating
                })
        
        return mock_ratings
    
    def _generate_mock_movies(self):
        """Generate mock movies data for testing"""
        categories = ["Action", "Comedy", "Drama", "Horror", "Sci-Fi", "Romance"]
        mock_movies = []
        
        for i in range(1, 51):
            category = np.random.choice(categories)
            mock_movies.append({
                "id": f"movie_{i}",
                "title": f"Movie {i}",
                "description": f"This is a {category.lower()} movie with exciting plot and great characters.",
                "category": category,
                "releaseDate": f"202{np.random.randint(0, 4)}-{np.random.randint(1, 13):02d}-01"
            })
        
        return mock_movies
    
    def build_user_item_matrix(self):
        """Build user-item matrix for collaborative filtering"""
        if not ratings_cache:
            return None
        
        # Create DataFrame from ratings
        df = pd.DataFrame(ratings_cache)
        df.columns = ['user_id', 'movie_id', 'rating']
        
        # Create user-item matrix
        self.user_item_matrix = df.pivot_table(
            index='user_id', 
            columns='movie_id', 
            values='rating'
        ).fillna(0)
        
        return self.user_item_matrix
    
    def build_content_features(self):
        """Build content-based features matrix"""
        if not movies_cache:
            return None
        
        # Create features from movie descriptions and categories
        movie_texts = []
        for movie in movies_cache:
            text = f"{movie['title']} {movie['description']} {movie['category']}"
            movie_texts.append(text)
        
        # Use TF-IDF to create feature vectors
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 2)
        )
        
        tfidf_matrix = self.tfidf_vectorizer.fit_transform(movie_texts)
        
        # Calculate content similarity matrix
        self.content_similarity_matrix = cosine_similarity(tfidf_matrix)
        
        return self.content_similarity_matrix
    
    def collaborative_filtering_recommendations(self, user_id: str, limit: int = 10):
        """Generate recommendations using collaborative filtering with scores"""
        if self.user_item_matrix is None:
            self.build_user_item_matrix()
        
        if user_id not in self.user_item_matrix.index:
            return []
        
        # Calculate user similarity
        user_ratings = self.user_item_matrix.loc[user_id].values.reshape(1, -1)
        user_similarity = cosine_similarity(user_ratings, self.user_item_matrix.values)[0]
        
        # Get similar users (excluding the user itself)
        similar_users_idx = np.argsort(user_similarity)[::-1][1:11]  # Top 10 similar users
        
        # Get movies rated by similar users but not by target user
        user_movies = set(self.user_item_matrix.columns[self.user_item_matrix.loc[user_id] > 0])
        recommendations = {}
        
        for idx in similar_users_idx:
            similar_user = self.user_item_matrix.index[idx]
            similar_user_movies = self.user_item_matrix.loc[similar_user]
            
            for movie_id, rating in similar_user_movies.items():
                if rating > 0 and movie_id not in user_movies:
                    if movie_id not in recommendations:
                        recommendations[movie_id] = []
                    recommendations[movie_id].append(rating * user_similarity[idx])
        
        # Calculate average weighted ratings
        movie_scores = {}
        for movie_id, scores in recommendations.items():
            movie_scores[movie_id] = np.mean(scores)
        
        # Sort and return top recommendations with scores
        sorted_recommendations = sorted(movie_scores.items(), key=lambda x: x[1], reverse=True)
        return [{"movieId": movie_id, "score": float(score)} for movie_id, score in sorted_recommendations[:limit]]
    
    def content_based_recommendations(self, user_id: str, limit: int = 10):
        """Generate recommendations using content-based filtering with scores"""
        if self.content_similarity_matrix is None:
            self.build_content_features()
        
        # Get user's rated movies
        user_ratings = [r for r in ratings_cache if r['userId'] == user_id]
        if not user_ratings:
            return []
        
        # Get highly rated movies by user (rating >= 4)
        liked_movies = [r['movieId'] for r in user_ratings if r['score'] >= 4]
        if not liked_movies:
            return []
        
        # Find similar movies based on content
        movie_ids = [m['id'] for m in movies_cache]
        recommendations = {}
        
        for liked_movie in liked_movies:
            if liked_movie in movie_ids:
                movie_idx = movie_ids.index(liked_movie)
                similar_scores = self.content_similarity_matrix[movie_idx]
                
                for i, score in enumerate(similar_scores):
                    movie_id = movie_ids[i]
                    if movie_id != liked_movie and movie_id not in [r['movieId'] for r in user_ratings]:
                        if movie_id not in recommendations:
                            recommendations[movie_id] = []
                        recommendations[movie_id].append(score)
        
        # Calculate average similarity scores
        movie_scores = {}
        for movie_id, scores in recommendations.items():
            movie_scores[movie_id] = np.mean(scores)
        
        # Sort and return top recommendations with scores
        sorted_recommendations = sorted(movie_scores.items(), key=lambda x: x[1], reverse=True)
        return [{"movieId": movie_id, "score": float(score)} for movie_id, score in sorted_recommendations[:limit]]
    
    def get_popular_movies_fallback(self, limit: int = 10):
        """Get popular movies as fallback when no personalized recommendations are available"""
        if not movies_cache:
            return []
        
        # Calculate movie popularity based on ratings
        movie_popularity = {}
        movie_avg_rating = {}
        
        for rating in ratings_cache:
            movie_id = rating['movieId']
            score = rating['score']
            
            if movie_id not in movie_popularity:
                movie_popularity[movie_id] = []
            movie_popularity[movie_id].append(score)
        
        # Calculate average rating and rating count for each movie
        popular_movies = []
        for movie_id, ratings in movie_popularity.items():
            avg_rating = np.mean(ratings)
            rating_count = len(ratings)
            
            # Simple popularity score: average rating * log(rating count + 1)
            # This favors movies with higher ratings and more ratings
            popularity_score = avg_rating * np.log(rating_count + 1)
            
            popular_movies.append({
                "movieId": movie_id,
                "score": float(popularity_score)
            })
        
        # Sort by popularity score and return top movies
        popular_movies.sort(key=lambda x: x['score'], reverse=True)
        
        # If we don't have enough rated movies, fill with random movies from cache
        if len(popular_movies) < limit:
            rated_movie_ids = set(movie['movieId'] for movie in popular_movies)
            unrated_movies = [
                {"movieId": movie['id'], "score": 2.5}  # Default score for unrated movies
                for movie in movies_cache 
                if movie['id'] not in rated_movie_ids
            ]
            popular_movies.extend(unrated_movies)
        
        return popular_movies[:limit]
    
    def hybrid_recommendations(self, user_id: str, limit: int = 10):
        """Generate recommendations using hybrid approach with fallback"""
        # Get user's rating count
        user_rating_count = len([r for r in ratings_cache if r['userId'] == user_id])
        
        recommendations = []
        
        if user_rating_count >= MIN_RATINGS_FOR_CF:
            # Use collaborative filtering for users with enough ratings
            cf_recs = self.collaborative_filtering_recommendations(user_id, limit)
            content_recs = self.content_based_recommendations(user_id, limit // 2)
            
            # Combine recommendations with weighted scores
            combined_dict = {}
            
            # Add CF recommendations with higher weight
            for rec in cf_recs[:limit//2]:
                combined_dict[rec['movieId']] = rec['score'] * 0.7
            
            # Add content recommendations with lower weight
            for rec in content_recs:
                if rec['movieId'] not in combined_dict:
                    combined_dict[rec['movieId']] = rec['score'] * 0.3
                else:
                    combined_dict[rec['movieId']] += rec['score'] * 0.3
            
            # Sort by combined score
            sorted_recs = sorted(combined_dict.items(), key=lambda x: x[1], reverse=True)
            recommendations = [{"movieId": movie_id, "score": float(score)} for movie_id, score in sorted_recs[:limit]]
        
        elif user_rating_count > 0:
            # Use content-based for users with some ratings
            recommendations = self.content_based_recommendations(user_id, limit)
        
        # If still no recommendations, use popular movies fallback
        if not recommendations:
            logger.info(f"No personalized recommendations for user {user_id}, using popular movies fallback")
            recommendations = self.get_popular_movies_fallback(limit)
        
        return recommendations

    # Also add a method to test the connection
    async def test_backend_connection(self):
        """Test connection to Nest.js backend"""
        try:
            # Test ratings endpoint
            ratings_response = requests.get(f"{NEST_BACKEND_URL}/ratings/stats", timeout=5)
            ratings_status = ratings_response.status_code == 200
            
            # Test movies endpoint  
            movies_response = requests.get(f"{NEST_BACKEND_URL}/movies", timeout=5)
            movies_status = movies_response.status_code == 200
            
            return {
                "backend_url": NEST_BACKEND_URL,
                "ratings_endpoint": ratings_status,
                "movies_endpoint": movies_status,
                "overall_status": ratings_status and movies_status
            }
        except Exception as e:
            logger.error(f"Backend connection test failed: {e}")
            return {
                "backend_url": NEST_BACKEND_URL,
                "ratings_endpoint": False,
                "movies_endpoint": False,
                "overall_status": False,
                "error": str(e)
            }

# Initialize recommendation engine
rec_engine = RecommendationEngine()

@app.on_event("startup")
async def startup_event():
    """Load data on startup"""
    await rec_engine.load_data()

@app.get("/")
async def root():
    return {
        "message": "Movie Recommendation Service",
        "version": "1.0.0",
        "endpoints": {
            "recommendations": "/recommend",
            "health": "/health",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "data_status": {
            "ratings_count": len(ratings_cache),
            "movies_count": len(movies_cache),
            "last_update": last_cache_update.isoformat() if last_cache_update else None
        }
    }

# Update the endpoints
@app.get("/recommend")
async def get_recommendations(
    userId: str = Query(..., description="User ID to generate recommendations for"),
    limit: int = Query(10, ge=1, le=50, description="Number of recommendations to return"),
    type: str = Query("hybrid", description="Recommendation type: collaborative, content, or hybrid")
):
    """Generate movie recommendations for a user"""
    try:
        # Refresh data if needed
        await rec_engine.load_data()
        
        # Generate recommendations based on type
        if type == "collaborative":
            recommendations = rec_engine.collaborative_filtering_recommendations(userId, limit)
        elif type == "content":
            recommendations = rec_engine.content_based_recommendations(userId, limit)
        else:  # hybrid
            recommendations = rec_engine.hybrid_recommendations(userId, limit)
        
        return {
            "recommendations": recommendations,  # Changed from recommended_movies
            "userId": userId,  # Changed from user_id
            "algorithm": type,
            "generatedAt": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error generating recommendations for user {userId}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
@app.post("/recommend")
async def post_recommendations(request: RecommendationRequest):
    """Generate movie recommendations for a user (POST method)"""
    try:
        # Refresh data if needed
        await rec_engine.load_data()
        
        # Generate recommendations based on type
        if request.recommendation_type == "collaborative":
            recommendations = rec_engine.collaborative_filtering_recommendations(
                request.user_id, request.limit
            )
        elif request.recommendation_type == "content":
            recommendations = rec_engine.content_based_recommendations(
                request.user_id, request.limit
            )
        else:  # hybrid
            recommendations = rec_engine.hybrid_recommendations(
                request.user_id, request.limit
            )
        
        return RecommendationResponse(
            user_id=request.user_id,
            recommended_movies=recommendations,
            recommendation_type=request.recommendation_type,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error generating recommendations for user {request.user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Add a new endpoint to test backend connectivity
@app.get("/backend-status")
async def get_backend_status():
    """Check connectivity to Nest.js backend"""
    status = await rec_engine.test_backend_connection()
    return {
        "timestamp": datetime.now().isoformat(),
        "backend_connectivity": status
    }

@app.get("/stats")
async def get_stats():
    """Get recommendation service statistics"""
    await rec_engine.load_data()
    
    # Calculate some basic stats
    total_ratings = len(ratings_cache)
    total_movies = len(movies_cache)
    unique_users = len(set(r['userId'] for r in ratings_cache))
    
    # Rating distribution
    rating_dist = {}
    for rating in ratings_cache:
        score = rating['score']
        rating_dist[score] = rating_dist.get(score, 0) + 1
    
    return {
        "total_ratings": total_ratings,
        "total_movies": total_movies,
        "unique_users": unique_users,
        "rating_distribution": rating_dist,
        "average_rating": np.mean([r['score'] for r in ratings_cache]) if ratings_cache else 0
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000, reload=True)