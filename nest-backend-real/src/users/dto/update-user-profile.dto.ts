import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsMongoId, IsOptional, IsString } from 'class-validator';
export class UpdateUserProfileDto {
    @ApiProperty({ description: 'User name', required: false })
    @IsOptional()
    @IsString()
    name?: string;
    @ApiProperty({ description: 'User address', required: false })
    @IsOptional()
    @IsString()
    address?: string;
    @ApiProperty({ description: 'Profile image URL', required: false })
    @IsOptional()
    @IsString()
    imageUrl?: string;
    @ApiProperty({ description: 'Date of birth', required: false })
    @IsOptional()
    @IsDateString()
    dob?: string;
    @ApiProperty({
        description: 'Array of category IDs',
        type: [String],
        required: false
    })
    @IsOptional()
    @IsArray()
    @IsMongoId({ each: true })
    categories?: string[];
}