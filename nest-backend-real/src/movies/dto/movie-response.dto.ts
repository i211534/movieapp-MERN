import { ApiProperty } from '@nestjs/swagger';

export class CategoryInMovieDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty({ required: false })
    description?: string;
}

export class MovieResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    title: string;

    @ApiProperty()
    description: string;

    @ApiProperty()
    releaseDate: Date;

    @ApiProperty({
        description: 'URL of the movie poster image',
        example: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop'
    })
    imageUrl: string;

    @ApiProperty({ type: CategoryInMovieDto })
    category: CategoryInMovieDto;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;
}