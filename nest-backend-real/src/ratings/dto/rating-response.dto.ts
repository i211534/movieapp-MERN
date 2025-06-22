import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

class MovieResponse {
    @ApiProperty()
    @Transform(({ value }) => value.toString())
    _id: string;

    @ApiProperty()
    title: string;

    @ApiProperty()
    description: string;

    @ApiProperty()
    releaseDate: Date;

    @ApiProperty()
    category: {
        _id: string;
        name: string;
        description?: string;
    };
}

export class RatingResponseDto {
    @ApiProperty()
    @Transform(({ value }) => value.toString())
    _id: string;

    @ApiProperty()
    @Transform(({ value }) => value.toString())
    userId: string;

    @ApiProperty()
    @Transform(({ value }) => value.toString())
    movieId: string;

    @ApiProperty({ minimum: 1, maximum: 5 })
    score: number;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    constructor(partial: Partial<RatingResponseDto>) {
        Object.assign(this, partial);
    }
}

export class RatingWithMovieResponseDto {
    @ApiProperty()
    @Transform(({ value }) => value.toString())
    _id: string;

    @ApiProperty()
    @Transform(({ value }) => value.toString())
    userId: string;

    @ApiProperty({ type: MovieResponse })
    @Type(() => MovieResponse)
    movie: MovieResponse;

    @ApiProperty({ minimum: 1, maximum: 5 })
    score: number;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    constructor(partial: Partial<RatingWithMovieResponseDto>) {
        Object.assign(this, partial);
    }
}