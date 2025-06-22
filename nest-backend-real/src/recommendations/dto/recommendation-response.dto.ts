// dto/recommendation-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class CategoryDto {
    @ApiProperty({
        description: 'Category ID',
        example: '6854d626fe25a59fe2dbcd5b'
    })
    @IsString()
    _id: string;

    @ApiProperty({
        description: 'Category name',
        example: 'Comedy'
    })
    @IsString()
    name: string;

    @ApiProperty({
        description: 'Category description',
        example: 'Humorous movies designed to entertain and make audiences laugh',
        required: false
    })
    @IsOptional()
    @IsString()
    description?: string;

    constructor(partial: Partial<CategoryDto>) {
        Object.assign(this, partial);
    }
}

export class RecommendedMovieDto {
    @ApiProperty({
        description: 'Movie ID',
        example: '685512f566ebe5be87476fe0'
    })
    @IsString()
    _id: string;

    @ApiProperty({
        description: 'Movie title',
        example: 'Superbad'
    })
    @IsString()
    title: string;

    @ApiProperty({
        description: 'Movie description',
        example: 'Two co-dependent high school seniors are forced to deal with separation anxiety after their plan to stage a booze-soaked party goes awry.'
    })
    @IsString()
    description: string;

    @ApiProperty({
        description: 'Movie release date',
        example: '2007-08-17T00:00:00.000Z'
    })
    @IsDateString()
    releaseDate: Date;

    @ApiProperty({
        description: 'Movie image URL',
        example: 'https://image.tmdb.org/t/p/w500/pThyQovXQrw2m0s9x82twj48Jq4.jpg',
        required: false
    })
    @IsOptional()
    @IsString()
    imageUrl?: string;

    @ApiProperty({
        description: 'Movie category',
        type: CategoryDto
    })
    @ValidateNested()
    @Type(() => CategoryDto)
    category: CategoryDto;

    @ApiProperty({
        description: 'Movie creation timestamp',
        example: '2025-06-20T07:51:17.062Z'
    })
    @IsDateString()
    createdAt: Date;

    @ApiProperty({
        description: 'Movie last update timestamp',
        example: '2025-06-20T07:51:17.062Z'
    })
    @IsDateString()
    updatedAt: Date;

    @ApiProperty({
        description: 'Recommendation score (0-1)',
        example: 0.02566035016412784
    })
    @IsNumber()
    recommendationScore: number;

    constructor(partial: Partial<RecommendedMovieDto>) {
        Object.assign(this, partial);
        if (partial.category) {
            this.category = new CategoryDto(partial.category);
        }
    }
}

export class RecommendationsResponseDto {
    @ApiProperty({
        description: 'Array of recommended movies',
        type: [RecommendedMovieDto]
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RecommendedMovieDto)
    recommendations: RecommendedMovieDto[];

    @ApiProperty({
        description: 'Total number of recommendations',
        example: 5
    })
    @IsNumber()
    total: number;

    @ApiProperty({
        description: 'User ID for whom recommendations were generated',
        example: '6854e92ae44dee1ca73ff646'
    })
    @IsString()
    userId: string;

    @ApiProperty({
        description: 'Timestamp when recommendations were generated',
        example: '2025-06-20T15:04:18.351Z'
    })
    @IsDateString()
    generatedAt: Date;

    constructor(partial: Partial<RecommendationsResponseDto>) {
        Object.assign(this, partial);
        if (partial.recommendations) {
            this.recommendations = partial.recommendations.map(rec =>
                rec instanceof RecommendedMovieDto ? rec : new RecommendedMovieDto(rec)
            );
        }
    }
}