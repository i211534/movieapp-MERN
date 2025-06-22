//movie-search.dto:
import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';
export class MovieSearchDto {
    @ApiProperty({
        description: 'Search query for movie title or description',
        example: 'action hero',
        required: false
    })
    @IsOptional()
    @IsString()
    @MinLength(1)
    q?: string;
}