import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) { }

    async findById(id: string): Promise<UserDocument> {
        if (!Types.ObjectId.isValid(id)) {
            throw new BadRequestException('Invalid user ID');
        }

        const user = await this.userModel
            .findById(id)
            .populate('categories', 'name description')
            .exec();

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async updateProfile(
        userId: string,
        updateUserProfileDto: UpdateUserProfileDto,
    ): Promise<UserDocument> {
        if (!Types.ObjectId.isValid(userId)) {
            throw new BadRequestException('Invalid user ID');
        }

        // Validate category IDs if provided
        if (updateUserProfileDto.categories) {
            const validCategoryIds = updateUserProfileDto.categories.every(id =>
                Types.ObjectId.isValid(id),
            );
            if (!validCategoryIds) {
                throw new BadRequestException('Invalid category IDs provided');
            }
        }

        const updateData = { ...updateUserProfileDto };

        // Convert category strings to ObjectIds
        if (updateData.categories) {
            updateData.categories = updateData.categories.map(id => new Types.ObjectId(id) as any);
        }

        // Convert dob string to Date if provided
        if (updateData.dob) {
            updateData.dob = new Date(updateData.dob) as any;
        }

        const updatedUser = await this.userModel
            .findByIdAndUpdate(
                userId,
                { $set: updateData },
                { new: true, runValidators: true },
            )
            .populate('categories', 'name description')
            .exec();

        if (!updatedUser) {
            throw new NotFoundException('User not found');
        }

        return updatedUser;
    }

    async findByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ email }).exec();
    }

    async create(userData: Partial<User>): Promise<UserDocument> {
        const user = new this.userModel(userData);
        return user.save();
    }
}