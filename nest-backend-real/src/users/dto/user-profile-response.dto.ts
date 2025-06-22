import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Transform, Type } from 'class-transformer';

class CategoryResponse {
    @ApiProperty()
    @Transform(({ value }) => value.toString())
    _id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    description?: string;
}

export class UserProfileResponseDto {
    @ApiProperty()
    @Transform(({ value }) => value.toString())
    _id: string;

    @ApiProperty()
    email: string;

    @ApiProperty()
    name: string;

    @ApiProperty({ required: false })
    address?: string;

    @ApiProperty({ required: false })
    imageUrl?: string;

    @ApiProperty({ required: false })
    dob?: Date;

    @ApiProperty({ type: [CategoryResponse], required: false })
    @Type(() => CategoryResponse)
    categories?: CategoryResponse[];

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    @Exclude()
    password: string;

    constructor(partial: Partial<UserProfileResponseDto>) {
        Object.assign(this, partial);
    }
}