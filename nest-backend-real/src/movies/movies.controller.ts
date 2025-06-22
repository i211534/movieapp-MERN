import { Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';
import { Category } from 'src/categories'; // Import Category type
import { MovieResponseDto } from './dto/movie-response.dto';
import { MovieSearchDto } from './dto/movie-search.dto';
import { MoviesService } from './movies.service';

@ApiTags('Movies')
@Controller('movies')
export class MoviesController {
    constructor(private moviesService: MoviesService) { }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get all movies',
        description: 'Retrieve a list of all movies with populated category information, sorted by release date (newest first)'
    })
    @ApiResponse({
        status: 200,
        description: 'List of movies retrieved successfully',
        type: [MovieResponseDto]
    })
    async findAll(): Promise<MovieResponseDto[]> {
        const movies = await this.moviesService.findAll();
        return movies.map(movie => this.transformMovieToResponse(movie));
    }

    @Get('category/:categoryId')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get movies by category',
        description: 'Retrieve all movies that belong to a specific category'
    })
    @ApiParam({
        name: 'categoryId',
        description: 'Category ID to filter movies',
        type: 'string'
    })
    @ApiResponse({
        status: 200,
        description: 'Movies retrieved successfully',
        type: [MovieResponseDto]
    })
    @ApiResponse({
        status: 404,
        description: 'Category not found'
    })
    async findByCategory(@Param('categoryId') categoryId: string): Promise<MovieResponseDto[]> {
        const movies = await this.moviesService.findByCategory(categoryId);
        return movies.map(movie => this.transformMovieToResponse(movie));
    }

    @Get('search')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Search movies',
        description: 'Search for movies by title or description using text search. Returns all movies if no query provided.'
    })
    @ApiQuery({
        name: 'q',
        required: false,
        description: 'Search query for movie title or description',
        example: 'action hero'
    })
    @ApiResponse({
        status: 200,
        description: 'Search results retrieved successfully',
        type: [MovieResponseDto]
    })
    async searchMovies(@Query() searchDto: MovieSearchDto): Promise<MovieResponseDto[]> {
        const movies = await this.moviesService.searchMovies(searchDto.q || '');
        return movies.map(movie => this.transformMovieToResponse(movie));
    }

    // NEW: Get single movie by ID
    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get movie by ID',
        description: 'Retrieve a single movie by its ID with populated category information'
    })
    @ApiParam({
        name: 'id',
        description: 'Movie ID',
        type: 'string'
    })
    @ApiResponse({
        status: 200,
        description: 'Movie retrieved successfully',
        type: MovieResponseDto
    })
    @ApiResponse({
        status: 404,
        description: 'Movie not found'
    })
    @ApiResponse({
        status: 400,
        description: 'Invalid movie ID format'
    })
    async findOne(@Param('id') id: string): Promise<MovieResponseDto> {
        // Validate MongoDB ObjectId format
        if (!Types.ObjectId.isValid(id)) {
            throw new NotFoundException('Invalid movie ID format');
        }

        const movie = await this.moviesService.findById(id);
        if (!movie) {
            throw new NotFoundException('Movie not found');
        }

        return this.transformMovieToResponse(movie);
    }

    // Type guard to check if category is populated
    private isCategoryPopulated(category: Types.ObjectId | Category): category is Category & { _id: Types.ObjectId } {
        return typeof category === 'object' && 'name' in category;
    }

    private transformMovieToResponse(movie: any): MovieResponseDto {
        // Ensure category is populated - this should be handled in the service layer
        if (!this.isCategoryPopulated(movie.category)) {
            throw new Error('Movie category must be populated to create response');
        }

        return {
            id: movie._id.toString(),
            title: movie.title,
            description: movie.description,
            releaseDate: movie.releaseDate,
            imageUrl: movie.imageUrl,
            category: {
                id: movie.category._id.toString(),
                name: movie.category.name,
                description: movie.category.description,
            },
            createdAt: movie.createdAt,
            updatedAt: movie.updatedAt,
        };
    }
}