//ratings.controller
import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Request,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateRatingDto } from './dto/create-rating.dto';
import { RatingResponseDto, RatingWithMovieResponseDto } from './dto/rating-response.dto';
import { RatingsService } from './ratings.service';

@ApiTags('Ratings')
@Controller('ratings')
export class RatingsController {
    constructor(private readonly ratingsService: RatingsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Create or update a movie rating',
        description: 'Creates a new rating or updates existing rating for a movie by the current user'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Rating created or updated successfully',
        type: RatingResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid input data',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Unauthorized',
    })
    async createOrUpdateRating(
        @Request() req,
        @Body() createRatingDto: CreateRatingDto,
    ): Promise<RatingResponseDto> {
        const rating = await this.ratingsService.createOrUpdateRating(
            req.user.userId,
            createRatingDto,
        );
        return new RatingResponseDto(rating.toObject());
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get current user ratings',
        description: 'Retrieves all ratings made by the current user with movie details'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'User ratings retrieved successfully',
        type: [RatingWithMovieResponseDto],
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Unauthorized',
    })
    async getMyRatings(@Request() req): Promise<RatingWithMovieResponseDto[]> {
        const ratings = await this.ratingsService.getUserRatings(req.user.userId);

        return ratings.map(rating => {
            const ratingObj = rating.toObject();
            return new RatingWithMovieResponseDto({
                ...ratingObj,
                movie: ratingObj.movieId, // movieId is populated with movie data
            });
        });
    }

    @Get('movie/:movieId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get movie ratings',
        description: 'Retrieves all ratings for a specific movie'
    })
    @ApiParam({
        name: 'movieId',
        description: 'Movie ID',
        type: String,
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Movie ratings retrieved successfully',
        type: [RatingResponseDto],
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid movie ID',
    })
    async getMovieRatings(
        @Param('movieId') movieId: string,
    ): Promise<RatingResponseDto[]> {
        const ratings = await this.ratingsService.getMovieRatings(movieId);
        return ratings.map(rating => new RatingResponseDto(rating.toObject()));
    }

    @Get('movie/:movieId/average')
    @ApiOperation({
        summary: 'Get movie average rating',
        description: 'Retrieves the average rating and total count for a specific movie'
    })
    @ApiParam({
        name: 'movieId',
        description: 'Movie ID',
        type: String,
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Movie average rating retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                average: { type: 'number', example: 4.2 },
                count: { type: 'number', example: 15 },
            },
        },
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid movie ID',
    })
    async getMovieAverageRating(
        @Param('movieId') movieId: string,
    ): Promise<{ average: number; count: number }> {
        return this.ratingsService.getMovieAverageRating(movieId);
    }

    @Get('movie/:movieId/me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Get my rating for a specific movie',
        description: 'Retrieves the current user rating for a specific movie'
    })
    @ApiParam({
        name: 'movieId',
        description: 'Movie ID',
        type: String,
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'User rating for movie retrieved successfully',
        type: RatingResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Rating not found',
    })
    async getMyRatingForMovie(
        @Request() req,
        @Param('movieId') movieId: string,
    ): Promise<RatingResponseDto | null> {
        const rating = await this.ratingsService.getRatingByUserAndMovie(
            req.user.userId,
            movieId,
        );

        if (!rating) {
            return null;
        }

        return new RatingResponseDto(rating.toObject());
    }

    @Delete('movie/:movieId')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({
        summary: 'Delete my rating for a movie',
        description: 'Deletes the current user rating for a specific movie'
    })
    @ApiParam({
        name: 'movieId',
        description: 'Movie ID',
        type: String,
    })
    @ApiResponse({
        status: HttpStatus.NO_CONTENT,
        description: 'Rating deleted successfully',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'Rating not found',
    })
    async deleteMyRating(
        @Request() req,
        @Param('movieId') movieId: string,
    ): Promise<void> {
        await this.ratingsService.deleteRating(req.user.userId, movieId);
    }

    // NEW ENDPOINT: Get all ratings (for recommendation service)
    @Get('all')
    @ApiOperation({
        summary: 'Get all ratings (for recommendation service)',
        description: 'Retrieves all ratings in the system - used by recommendation microservice'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'All ratings retrieved successfully',
        schema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    userId: { type: 'string' },
                    movieId: { type: 'string' },
                    score: { type: 'number' },
                    createdAt: { type: 'string', format: 'date-time' }
                }
            }
        }
    })
    async getAllRatings(): Promise<any[]> {
        const ratings = await this.ratingsService.getAllRatings();
        return ratings.map(rating => ({
            userId: rating.userId.toString(),
            movieId: rating.movieId.toString(),
            score: rating.score,
            createdAt: rating.createdAt
        }));
    }

    // BONUS ENDPOINT: Get ratings statistics
    @Get('stats')
    @ApiOperation({
        summary: 'Get ratings statistics',
        description: 'Retrieves overall ratings statistics for monitoring and analytics'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Ratings statistics retrieved successfully',
        schema: {
            type: 'object',
            properties: {
                totalRatings: { type: 'number' },
                uniqueUsers: { type: 'number' },
                uniqueMovies: { type: 'number' },
                averageScore: { type: 'number' },
                ratingDistribution: {
                    type: 'object',
                    additionalProperties: { type: 'number' }
                }
            }
        }
    })
    async getRatingsStats(): Promise<{
        totalRatings: number;
        uniqueUsers: number;
        uniqueMovies: number;
        averageScore: number;
        ratingDistribution: Record<number, number>;
    }> {
        return this.ratingsService.getRatingsStats();
    }
}