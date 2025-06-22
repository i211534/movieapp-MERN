import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Category } from 'src/categories'; // Import Category schema

export interface MovieDocument extends Movie, Document {
    createdAt: Date;
    updatedAt: Date;
}

// Create a separate interface for populated movies
export interface PopulatedMovieDocument extends Omit<MovieDocument, 'category'> {
    category: Category & { _id: Types.ObjectId };
}

@Schema({ timestamps: true })
export class Movie {
    @Prop({ required: true })
    title: string;

    @Prop({ required: true })
    description: string;

    @Prop({ required: true })
    releaseDate: Date;

    @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
    category: Types.ObjectId | Category; // Allow both ObjectId and populated Category

    @Prop({ required: true })
    imageUrl: string;

    // These will be added automatically by MongoDB when timestamps: true
    createdAt?: Date;
    updatedAt?: Date;
}

export const MovieSchema = SchemaFactory.createForClass(Movie);

// Create text index for search functionality
MovieSchema.index({ title: 'text', description: 'text' });