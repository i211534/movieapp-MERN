import {
    BadRequestException,
    Controller,
    Get,
    HttpStatus,
    Query,
    Request,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiOperation,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RecommendationsResponseDto } from './dto/recommendation-response.dto';
import { RecommendationsService } from './recommendations.service';

@ApiTags('Recommendations')
@Controller('recommendations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecommendationsController {
    constructor(private readonly recommendationsService: RecommendationsService) { }

    @Get()
    @ApiOperation({
        summary: 'Get movie recommendations for current user',
        description: 'Fetches personalized movie recommendations using the Python recommendation service'
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Maximum number of recommendations to return',
        example: 10,
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Recommendations retrieved successfully',
        type: RecommendationsResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Unauthorized',
    })
    @ApiResponse({
        status: HttpStatus.SERVICE_UNAVAILABLE,
        description: 'Recommendation service is unavailable',
    })
    async getRecommendations(
        @Request() req,
        @Query('limit') limitParam?: string,
    ): Promise<RecommendationsResponseDto> {
        // Handle limit parameter manually with proper validation
        let limit = 10; // default value

        if (limitParam !== undefined) {
            const parsedLimit = parseInt(limitParam, 10);
            if (isNaN(parsedLimit) || parsedLimit < 1) {
                throw new BadRequestException('Limit must be a positive number');
            }
            limit = Math.min(parsedLimit, 50); // Cap at 50 recommendations
        }

        return this.recommendationsService.getRecommendations(
            req.user.userId,
            limit
        );
    }

    @Get('health')
    @ApiOperation({
        summary: 'Check recommendation service health',
        description: 'Checks if the Python recommendation service is available'
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Health check completed',
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', example: 'healthy' },
                service: { type: 'string', example: 'python-recommender' },
            },
        },
    })
    async getHealth(): Promise<{ status: string; service: string }> {
        return this.recommendationsService.getRecommendationHealth();
    }
}