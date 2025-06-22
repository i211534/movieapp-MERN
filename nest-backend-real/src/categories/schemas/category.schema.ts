import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface CategoryDocument extends Category, Document {
    createdAt: Date;
    updatedAt: Date;
}

@Schema({ timestamps: true })
export class Category {
    @Prop({ required: true, unique: true })
    name: string;

    @Prop()
    description?: string;

    // These will be added automatically by MongoDB when timestamps: true
    createdAt?: Date;
    updatedAt?: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);