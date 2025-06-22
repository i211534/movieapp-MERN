import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateRatingDto } from './dto/create-rating.dto';
import { Rating, RatingDocument } from './schemas/rating.schema';

@Injectable()
export class RatingsService {
    constructor(
        @InjectModel(Rating.name) private ratingModel: Model<RatingDocument>,
    ) { }

    async createOrUpdateRating(
        userId: string,
        createRatingDto: CreateRatingDto,
    ): Promise<RatingDocument> {
        if (!Types.ObjectId.isValid(userId)) {
            throw new BadRequestException('Invalid user ID');
        }

        if (!Types.ObjectId.isValid(createRatingDto.movieId)) {
            throw new BadRequestException('Invalid movie ID');
        }

        const userObjectId = new Types.ObjectId(userId);
        const movieObjectId = new Types.ObjectId(createRatingDto.movieId);

        try {
            // Try to find existing rating and update it
            const existingRating = await this.ratingModel.findOneAndUpdate(
                { userId: userObjectId, movieId: movieObjectId },
                {
                    score: createRatingDto.score,
                    updatedAt: new Date()
                },
                { new: true, upsert: true }
            ).exec();

            return existingRating;
        } catch (error) {
            if (error.code === 11000) {
                // Handle duplicate key error (shouldn't happen with upsert, but just in case)
                throw new ConflictException('Rating already exists for this movie');
            }
            throw error;
        }
    }

    async getUserRatings(userId: string): Promise<RatingDocument[]> {
        if (!Types.ObjectId.isValid(userId)) {
            throw new BadRequestException('Invalid user ID');
        }

        const userObjectId = new Types.ObjectId(userId);

        return this.ratingModel
            .find({ userId: userObjectId })
            .populate({
                path: 'movieId',
                select: 'title description releaseDate category',
                populate: {
                    path: 'category',
                    select: 'name description'
                }
            })
            .sort({ createdAt: -1 })
            .exec();
    }

    async getRatingByUserAndMovie(
        userId: string,
        movieId: string,
    ): Promise<RatingDocument | null> {
        if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(movieId)) {
            return null;
        }

        const userObjectId = new Types.ObjectId(userId);
        const movieObjectId = new Types.ObjectId(movieId);

        return this.ratingModel
            .findOne({ userId: userObjectId, movieId: movieObjectId })
            .exec();
    }

    async getMovieRatings(movieId: string): Promise<RatingDocument[]> {
        if (!Types.ObjectId.isValid(movieId)) {
            throw new BadRequestException('Invalid movie ID');
        }

        const movieObjectId = new Types.ObjectId(movieId);

        return this.ratingModel
            .find({ movieId: movieObjectId })
            .populate('userId', 'name email')
            .sort({ createdAt: -1 })
            .exec();
    }

    async getMovieAverageRating(movieId: string): Promise<{ average: number; count: number }> {
        if (!Types.ObjectId.isValid(movieId)) {
            throw new BadRequestException('Invalid movie ID');
        }

        const movieObjectId = new Types.ObjectId(movieId);

        const result = await this.ratingModel.aggregate([
            { $match: { movieId: movieObjectId } },
            {
                $group: {
                    _id: null,
                    average: { $avg: '$score' },
                    count: { $sum: 1 }
                }
            }
        ]);

        if (result.length === 0) {
            return { average: 0, count: 0 };
        }

        return {
            average: Math.round(result[0].average * 10) / 10, // Round to 1 decimal
            count: result[0].count
        };
    }

    async deleteRating(userId: string, movieId: string): Promise<boolean> {
        if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(movieId)) {
            throw new BadRequestException('Invalid user ID or movie ID');
        }

        const userObjectId = new Types.ObjectId(userId);
        const movieObjectId = new Types.ObjectId(movieId);

        const result = await this.ratingModel
            .deleteOne({ userId: userObjectId, movieId: movieObjectId })
            .exec();

        return result.deletedCount > 0;
    }

    // NEW METHOD: Get all ratings for the recommendation service
    async getAllRatings(): Promise<RatingDocument[]> {
        return this.ratingModel
            .find({})
            .select('userId movieId score createdAt') // Only select necessary fields for performance
            .lean() // Use lean() for better performance since we don't need Mongoose document features
            .exec();
    }

    // BONUS: Get ratings statistics for monitoring
    async getRatingsStats(): Promise<{
        totalRatings: number;
        uniqueUsers: number;
        uniqueMovies: number;
        averageScore: number;
        ratingDistribution: Record<number, number>;
    }> {
        const [stats] = await this.ratingModel.aggregate([
            {
                $group: {
                    _id: null,
                    totalRatings: { $sum: 1 },
                    uniqueUsers: { $addToSet: '$userId' },
                    uniqueMovies: { $addToSet: '$movieId' },
                    averageScore: { $avg: '$score' },
                    ratings: { $push: '$score' }
                }
            },
            {
                $project: {
                    totalRatings: 1,
                    uniqueUsers: { $size: '$uniqueUsers' },
                    uniqueMovies: { $size: '$uniqueMovies' },
                    averageScore: { $round: ['$averageScore', 2] },
                    ratings: 1
                }
            }
        ]);

        if (!stats) {
            return {
                totalRatings: 0,
                uniqueUsers: 0,
                uniqueMovies: 0,
                averageScore: 0,
                ratingDistribution: {}
            };
        }

        // Calculate rating distribution
        const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        stats.ratings.forEach((rating: number) => {
            ratingDistribution[rating] = (ratingDistribution[rating] || 0) + 1;
        });

        return {
            totalRatings: stats.totalRatings,
            uniqueUsers: stats.uniqueUsers,
            uniqueMovies: stats.uniqueMovies,
            averageScore: stats.averageScore,
            ratingDistribution
        };
    }
}