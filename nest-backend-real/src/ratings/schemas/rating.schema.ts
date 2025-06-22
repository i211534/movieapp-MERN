// src/ratings/schemas/rating.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RatingDocument = Rating & Document;

@Schema({ timestamps: true })
export class Rating {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'Movie', required: true })
    movieId: Types.ObjectId;

    @Prop({ required: true, min: 1, max: 5 })
    score: number;

    @Prop({ default: Date.now })
    createdAt: Date;

    @Prop({ default: Date.now })
    updatedAt: Date;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);

// Create compound unique index to prevent duplicate ratings from same user for same movie
RatingSchema.index({ userId: 1, movieId: 1 }, { unique: true });