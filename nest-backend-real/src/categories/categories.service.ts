import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';

@Injectable()
export class CategoriesService implements OnModuleInit {
    private readonly logger = new Logger(CategoriesService.name);

    constructor(
        @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    ) { }

    async onModuleInit() {
        await this.seedCategories();
    }

    private async seedCategories() {
        try {
            const existingCategories = await this.categoryModel.countDocuments();

            if (existingCategories === 0) {
                this.logger.log('Seeding categories...');

                const defaultCategories = [
                    {
                        name: 'Action',
                        description: 'Fast-paced movies with exciting sequences, fights, and adventures'
                    },
                    {
                        name: 'Horror',
                        description: 'Scary movies designed to frighten, unsettle, and thrill audiences'
                    },
                    {
                        name: 'Comedy',
                        description: 'Humorous movies designed to entertain and make audiences laugh'
                    },
                    {
                        name: 'Animated',
                        description: 'Movies created using animation techniques, often family-friendly'
                    }
                ];

                await this.categoryModel.insertMany(defaultCategories);
                this.logger.log(`Successfully seeded ${defaultCategories.length} categories`);
            } else {
                this.logger.log(`Categories already exist (${existingCategories} found), skipping seed`);
            }
        } catch (error) {
            this.logger.error('Error seeding categories:', error);
        }
    }

    async findAll(): Promise<CategoryDocument[]> {
        return this.categoryModel.find().sort({ name: 1 }).exec();
    }

    async findById(id: string): Promise<CategoryDocument | null> {
        return this.categoryModel.findById(id).exec();
    }

    async findOne(id: string): Promise<CategoryDocument> {
        const category = await this.categoryModel.findById(id).exec();

        if (!category) {
            throw new NotFoundException(`Category with ID ${id} not found`);
        }

        return category;
    }

    async findByName(name: string): Promise<CategoryDocument | null> {
        return this.categoryModel.findOne({ name: { $regex: new RegExp(name, 'i') } }).exec();
    }

    async create(name: string, description?: string): Promise<CategoryDocument> {
        const category = new this.categoryModel({ name, description });
        return category.save();
    }

    async update(id: string, name?: string, description?: string): Promise<CategoryDocument | null> {
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;

        return this.categoryModel.findByIdAndUpdate(
            id,
            updateData,
            { new: true }
        ).exec();
    }

    async delete(id: string): Promise<CategoryDocument | null> {
        return this.categoryModel.findByIdAndDelete(id).exec();
    }

    async count(): Promise<number> {
        return this.categoryModel.countDocuments().exec();
    }
}