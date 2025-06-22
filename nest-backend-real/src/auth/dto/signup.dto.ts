import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class SignupDto {
    @ApiProperty({ example: 'john@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'password123', minLength: 6 })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiProperty({ example: 'John Doe' })
    @IsString()
    name: string;

    @ApiProperty({ example: '123 Main St, City, Country', required: false })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
    @IsOptional()
    @IsString()
    imageUrl?: string;

    @ApiProperty({ example: '1990-01-01', required: false })
    @IsOptional()
    @IsDateString()
    dob?: string;

    @ApiProperty({ example: ['507f1f77bcf86cd799439011'], required: false })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    categories?: string[];
}