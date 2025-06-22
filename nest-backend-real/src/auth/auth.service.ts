import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model, Types } from 'mongoose';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class AuthService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private jwtService: JwtService,
    ) { }

    async signup(signupDto: SignupDto): Promise<AuthResponseDto> {
        const { email, password, name, address, imageUrl, dob, categories } = signupDto;

        // Check if user already exists
        const existingUser = await this.userModel.findOne({ email });
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Convert category strings to ObjectIds if provided
        const categoryIds = categories
            ? categories.map(id => new Types.ObjectId(id))
            : [];

        // Create user
        const user = new this.userModel({
            email,
            password: hashedPassword,
            name,
            address,
            imageUrl,
            dob: dob ? new Date(dob) : undefined,
            categories: categoryIds,
        });

        const savedUser = await user.save();

        // Generate JWT token
        const payload = { sub: savedUser._id.toString(), email: savedUser.email };
        const access_token = this.jwtService.sign(payload);

        return {
            access_token,
            user: {
                id: savedUser._id.toString(),
                email: savedUser.email,
                name: savedUser.name,
                address: savedUser.address,
                imageUrl: savedUser.imageUrl,
                dob: savedUser.dob,
                categories: savedUser.categories.map(cat => cat.toString()),
            },
        };
    }

    async login(loginDto: LoginDto): Promise<AuthResponseDto> {
        const { email, password } = loginDto;

        // Find user by email
        const user = await this.userModel.findOne({ email }).populate('categories');
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Generate JWT token
        const payload = { sub: user._id.toString(), email: user.email };
        const access_token = this.jwtService.sign(payload);

        return {
            access_token,
            user: {
                id: user._id.toString(),
                email: user.email,
                name: user.name,
                address: user.address,
                imageUrl: user.imageUrl,
                dob: user.dob,
                categories: user.categories.map(cat => cat.toString()),
            },
        };
    }

    async findUserById(id: string): Promise<UserDocument | null> {
        return this.userModel.findById(id).populate('categories');
    }

    async findUserByEmail(email: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ email }).populate('categories');
    }
}