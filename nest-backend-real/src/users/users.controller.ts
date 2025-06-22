//E:\EntryLevelExam\nest-backend\src\users\users.controller.ts
import {
    BadRequestException,
    Body,
    Controller,
    Get,
    HttpStatus,
    Patch,
    Request,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiBearerAuth,
    ApiBody,
    ApiConsumes,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import * as fs from 'fs';
import { Types } from 'mongoose'; // Add this import
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UserProfileResponseDto } from './dto/user-profile-response.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'User profile retrieved successfully',
        type: UserProfileResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Unauthorized',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'User not found',
    })
    async getProfile(@Request() req): Promise<UserProfileResponseDto> {
        const user = await this.usersService.findById(req.user.userId);
        return new UserProfileResponseDto(user.toObject());
    }

    @Patch('me')
    @ApiOperation({ summary: 'Update current user profile' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'User profile updated successfully',
        type: UserProfileResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid input data',
    })
    @ApiResponse({
        status: HttpStatus.UNAUTHORIZED,
        description: 'Unauthorized',
    })
    @ApiResponse({
        status: HttpStatus.NOT_FOUND,
        description: 'User not found',
    })
    async updateProfile(
        @Request() req,
        @Body() updateUserProfileDto: UpdateUserProfileDto,
    ): Promise<UserProfileResponseDto> {
        // Transform string category IDs to ObjectIds if categories are provided
        let transformedDto: any = {
            ...updateUserProfileDto,
        };

        if (updateUserProfileDto.categories && Array.isArray(updateUserProfileDto.categories)) {
            // Validate and transform category IDs
            const objectIdCategories = updateUserProfileDto.categories.map(categoryId => {
                if (!Types.ObjectId.isValid(categoryId)) {
                    throw new BadRequestException(`Invalid category ID: ${categoryId}`);
                }
                return new Types.ObjectId(categoryId);
            });

            transformedDto.categories = objectIdCategories;
        }

        const updatedUser = await this.usersService.updateProfile(
            req.user.userId,
            transformedDto,
        );
        return new UserProfileResponseDto(updatedUser.toObject());
    }

    @Patch('me/avatar')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: './uploads/avatars',
                filename: (req, file, cb) => {
                    // Create unique filename
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                    cb(null, `avatar-${uniqueSuffix}${extname(file.originalname)}`);
                },
            }),
            fileFilter: (req, file, cb) => {
                // Allow only image files
                if (file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
                    cb(null, true);
                } else {
                    cb(new BadRequestException('Only image files are allowed!'), false);
                }
            },
            limits: {
                fileSize: 5 * 1024 * 1024, // 5MB limit
            },
        }),
    )
    @ApiOperation({ summary: 'Upload user avatar' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
        },
    })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Avatar uploaded successfully',
        type: UserProfileResponseDto,
    })
    @ApiResponse({
        status: HttpStatus.BAD_REQUEST,
        description: 'Invalid file or file too large',
    })
    async uploadAvatar(
        @Request() req,
        @UploadedFile() file: Express.Multer.File,
    ): Promise<UserProfileResponseDto> {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Ensure uploads directory exists
        const uploadsDir = './uploads/avatars';
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Generate file URL (adjust based on your server setup)
        const imageUrl = `/uploads/avatars/${file.filename}`;

        const updatedUser = await this.usersService.updateProfile(req.user.userId, {
            imageUrl,
        });

        return new UserProfileResponseDto(updatedUser.toObject());
    }
}