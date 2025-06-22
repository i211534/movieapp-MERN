import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    password: string;

    @Prop({ required: true })
    name: string;

    @Prop()
    address?: string;

    @Prop()
    imageUrl?: string;

    @Prop()
    dob?: Date;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'Category' }], default: [] })
    categories: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);