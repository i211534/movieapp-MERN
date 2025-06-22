import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
    @ApiProperty()
    access_token: string;

    @ApiProperty()
    user: {
        id: string;
        email: string;
        name: string;
        address?: string;
        imageUrl?: string;
        dob?: Date;
        categories: string[];
    };
}