import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { TimeoutError, catchError, firstValueFrom, timeout } from 'rxjs';
import { Movie, MovieDocument } from '../movies/schemas/movie.schema';
import { RecommendationsResponseDto, RecommendedMovieDto } from './dto/recommendation-response.dto';
import {
    PythonRecommendationItem,
    PythonRecommendationRequest,
    PythonRecommendationResponse
} from './interfaces/python-service.interface';

// Interface for populated movie with category - UPDATED to include imageUrl
interface PopulatedMovie {
    _id: Types.ObjectId;
    title: string;
    description: string;
    releaseDate: Date;
    imageUrl?: string; // Added imageUrl field
    category: {
        _id: Types.ObjectId;
        name: string;
        description?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

@Injectable()
export class RecommendationsService {
    private readonly logger = new Logger(RecommendationsService.name);
    private readonly pythonServiceUrl: string;
    private readonly requestTimeout: number;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        @InjectModel(Movie.name) private movieModel: Model<MovieDocument>,
    ) {
        this.pythonServiceUrl = this.configService.get<string>(
            'PYTHON_RECOMMENDER_URL',
            'http://localhost:5000'
        );
        this.requestTimeout = this.configService.get<number>(
            'PYTHON_SERVICE_TIMEOUT',
            10000 // 10 seconds
        );
    }

    async getRecommendations(
        userId: string,
        limit: number = 10
    ): Promise<RecommendationsResponseDto> {
        if (!Types.ObjectId.isValid(userId)) {
            throw new BadRequestException('Invalid user ID');
        }

        this.logger.log(`Fetching recommendations for user: ${userId}`);

        try {
            // Call Python microservice
            const pythonResponse = await this.callPythonService(userId, limit);

            // Better null/empty checking
            const recommendations = pythonResponse?.recommendations || [];

            if (!Array.isArray(recommendations) || recommendations.length === 0) {
                this.logger.warn(`No recommendations returned for user: ${userId}`);
                return new RecommendationsResponseDto({
                    recommendations: [],
                    total: 0,
                    userId,
                    generatedAt: new Date(),
                });
            }

            // Extract movie IDs from Python response
            const movieIds = recommendations
                .filter(rec => rec && rec.movieId) // Filter out invalid entries
                .map(rec => rec.movieId);

            if (movieIds.length === 0) {
                this.logger.warn(`No valid movie IDs in recommendations for user: ${userId}`);
                return new RecommendationsResponseDto({
                    recommendations: [],
                    total: 0,
                    userId,
                    generatedAt: new Date(),
                });
            }

            // Fetch full movie documents
            const movies = await this.fetchMoviesByIds(movieIds);

            // Create recommendation DTOs with scores
            const recommendationDtos = this.mapMoviesToRecommendations(
                movies,
                recommendations
            );

            return new RecommendationsResponseDto({
                recommendations: recommendationDtos,
                total: recommendationDtos.length,
                userId,
                generatedAt: new Date(),
            });

        } catch (error) {
            this.logger.error(`Failed to get recommendations for user ${userId}:`, error.message);

            if (error instanceof BadRequestException) {
                throw error;
            }

            // Fallback to popular movies if recommendation service fails
            return this.getFallbackRecommendations(userId, limit);
        }
    }

    private async callPythonService(
        userId: string,
        limit: number
    ): Promise<PythonRecommendationResponse> {
        const url = `${this.pythonServiceUrl}/recommend`;
        const params: PythonRecommendationRequest = { userId, limit };

        this.logger.debug(`Calling Python service: ${url} with params:`, params);

        try {
            const response = await firstValueFrom(
                this.httpService.get<PythonRecommendationResponse>(url, {
                    params,
                    timeout: this.requestTimeout,
                }).pipe(
                    // Fix: Use timeout with proper configuration
                    timeout({
                        each: this.requestTimeout,
                        with: () => {
                            throw new TimeoutError();
                        }
                    }),
                    catchError((error) => {
                        this.logger.error('Python service error:', error.message);

                        // More specific error handling
                        if (error.code === 'ECONNREFUSED') {
                            throw new ServiceUnavailableException(
                                'Unable to connect to recommendation service'
                            );
                        }

                        if (error.code === 'ENOTFOUND') {
                            throw new ServiceUnavailableException(
                                'Recommendation service not found'
                            );
                        }

                        // Handle TimeoutError from RxJS
                        if (error instanceof TimeoutError || error.code === 'ETIMEDOUT') {
                            throw new ServiceUnavailableException(
                                'Recommendation service request timed out'
                            );
                        }

                        throw new ServiceUnavailableException(
                            'Recommendation service is temporarily unavailable'
                        );
                    })
                )
            );

            this.logger.debug('Python service response:', response.data);
            return response.data;

        } catch (error) {
            // Re-throw ServiceUnavailableException as-is
            if (error instanceof ServiceUnavailableException) {
                throw error;
            }

            // Handle other errors
            this.logger.error('Unexpected error calling Python service:', error);
            throw new ServiceUnavailableException(
                'Recommendation service is temporarily unavailable'
            );
        }
    }

    private async fetchMoviesByIds(movieIds: string[]): Promise<PopulatedMovie[]> {
        // Validate all movie IDs
        const validMovieIds = movieIds.filter(id => Types.ObjectId.isValid(id));

        if (validMovieIds.length === 0) {
            this.logger.warn('No valid movie IDs provided');
            return [];
        }

        const objectIds = validMovieIds.map(id => new Types.ObjectId(id));

        const movies = await this.movieModel
            .find({ _id: { $in: objectIds } })
            .populate('category', 'name description')
            .sort({ createdAt: -1 })
            .lean<PopulatedMovie[]>() // Use lean() for better performance and type safety
            .exec();

        this.logger.debug(`Fetched ${movies.length} movies from ${movieIds.length} IDs`);
        return movies;
    }

    private mapMoviesToRecommendations(
        movies: PopulatedMovie[],
        pythonRecommendations: PythonRecommendationItem[]
    ): RecommendedMovieDto[] {
        // Create a map for quick score lookup
        const scoreMap = new Map<string, number>();
        pythonRecommendations.forEach(rec => {
            scoreMap.set(rec.movieId, rec.score);
        });

        return movies.map(movie => {
            const recommendationScore = scoreMap.get(movie._id.toString());

            return new RecommendedMovieDto({
                _id: movie._id.toString(),
                title: movie.title,
                description: movie.description,
                releaseDate: movie.releaseDate,
                imageUrl: movie.imageUrl, // ADDED: Include imageUrl in the response
                category: {
                    _id: movie.category._id.toString(),
                    name: movie.category.name,
                    description: movie.category.description,
                },
                createdAt: movie.createdAt,
                updatedAt: movie.updatedAt,
                recommendationScore,
            });
        }).sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0));
    }

    private async getFallbackRecommendations(
        userId: string,
        limit: number
    ): Promise<RecommendationsResponseDto> {
        this.logger.log(`Using fallback recommendations for user: ${userId}`);

        // Return popular movies as fallback (you can implement your own logic)
        const fallbackMovies = await this.movieModel
            .find()
            .populate('category', 'name description')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean<PopulatedMovie[]>() // Use lean() for better performance and type safety
            .exec();

        const recommendations = fallbackMovies.map(movie => {
            return new RecommendedMovieDto({
                _id: movie._id.toString(),
                title: movie.title,
                description: movie.description,
                releaseDate: movie.releaseDate,
                imageUrl: movie.imageUrl, // ADDED: Include imageUrl in fallback response too
                category: {
                    _id: movie.category._id.toString(),
                    name: movie.category.name,
                    description: movie.category.description,
                },
                createdAt: movie.createdAt,
                updatedAt: movie.updatedAt,
            });
        });

        return new RecommendationsResponseDto({
            recommendations,
            total: recommendations.length,
            userId,
            generatedAt: new Date(),
        });
    }

    async getRecommendationHealth(): Promise<{ status: string; service: string }> {
        try {
            const healthUrl = `${this.pythonServiceUrl}/health`;
            const response = await firstValueFrom(
                this.httpService.get(healthUrl, {
                    timeout: 5000
                }).pipe(
                    // Fix: Use timeout with proper configuration for health check too
                    timeout({
                        each: 5000,
                        with: () => {
                            throw new TimeoutError();
                        }
                    }),
                    catchError(() => {
                        throw new Error('Health check failed');
                    })
                )
            );

            return {
                status: 'healthy',
                service: 'python-recommender',
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                service: 'python-recommender',
            };
        }
    }
}