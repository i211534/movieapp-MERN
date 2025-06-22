import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsNumber, Max, Min } from 'class-validator';

export class CreateRatingDto {
    @ApiProperty({
        description: 'Movie ID to rate',
        example: '507f1f77bcf86cd799439011'
    })
    @IsNotEmpty()
    @IsMongoId()
    movieId: string;

    @ApiProperty({
        description: 'Rating score between 1 and 5',
        minimum: 1,
        maximum: 5,
        example: 4
    })
    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    @Max(5)
    score: number;
}