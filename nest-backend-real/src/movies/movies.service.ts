import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CategoriesService } from '../categories/categories.service';
import { Movie, MovieDocument } from './schemas/movie.schema';

@Injectable()
export class MoviesService implements OnModuleInit {
    private readonly logger = new Logger(MoviesService.name);

    constructor(
        @InjectModel(Movie.name) private movieModel: Model<MovieDocument>,
        private categoriesService: CategoriesService,
    ) { }

    async onModuleInit() {
        await this.seedMovies();
    }

    private async seedMovies() {
        try {
            const existingMovies = await this.movieModel.countDocuments();

            if (existingMovies === 0) {
                this.logger.log('Seeding movies...');

                // Get categories for seeding
                const categories = await this.categoriesService.findAll();
                const actionCategory = categories.find(cat => cat.name === 'Action');
                const horrorCategory = categories.find(cat => cat.name === 'Horror');
                const comedyCategory = categories.find(cat => cat.name === 'Comedy');
                const animatedCategory = categories.find(cat => cat.name === 'Animated');

                if (!actionCategory || !horrorCategory || !comedyCategory || !animatedCategory) {
                    this.logger.warn('Categories not found, skipping movie seeding');
                    return;
                }

                const sampleMovies = [
                    // Action Movies
                    {
                        title: 'Die Hard',
                        description: 'A New York City police officer tries to save his wife and several others taken hostage by German terrorists during a Christmas party.',
                        releaseDate: new Date('1988-07-22'),
                        category: actionCategory._id,
                        imageUrl: 'https://image.tmdb.org/t/p/w500/yFihWxQcmqcaBR31QM6Y8gT6aYV.jpg',
                    },
                    {
                        title: 'Mad Max: Fury Road',
                        description: 'In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler in search for her homeland.',
                        releaseDate: new Date('2015-05-15'),
                        category: actionCategory._id,
                        imageUrl: 'https://image.tmdb.org/t/p/w500/hA2ple9q4qnwxp3hKVNhroipsir.jpg',
                    },
                    {
                        title: 'John Wick',
                        description: 'An ex-hitman comes out of retirement to track down the gangsters that took everything from him.',
                        releaseDate: new Date('2014-10-24'),
                        category: actionCategory._id,
                        imageUrl: 'https://image.tmdb.org/t/p/w500/fZPSd91yGE9fCcCe6OoQr6E3Bev.jpg',
                    },

                    // Horror Movies
                    {
                        title: 'The Conjuring',
                        description: 'Paranormal investigators Ed and Lorraine Warren work to help a family terrorized by a dark presence in their farmhouse.',
                        releaseDate: new Date('2013-07-19'),
                        category: horrorCategory._id,
                        imageUrl: 'https://image.tmdb.org/t/p/w500/wVYREutTvI2tmxr6ujrHT704wGF.jpg',
                    },
                    {
                        title: 'A Quiet Place',
                        description: 'A family is forced to live in silence while hiding from creatures that hunt by sound.',
                        releaseDate: new Date('2018-04-06'),
                        category: horrorCategory._id,
                        imageUrl: 'https://image.tmdb.org/t/p/w500/nAU74GmpUk7t5iklEp3bufwDq4n.jpg',
                    },
                    {
                        title: 'Hereditary',
                        description: 'A grieving family is haunted by tragedy and disturbing secrets.',
                        releaseDate: new Date('2018-06-08'),
                        category: horrorCategory._id,
                        imageUrl: 'https://image.tmdb.org/t/p/w500/lHV8HHlhwNup2VbpiACtlKzaGIQ.jpg',
                    },

                    // Comedy Movies
                    {
                        title: 'Superbad',
                        description: 'Two co-dependent high school seniors are forced to deal with separation anxiety after their plan to stage a booze-soaked party goes awry.',
                        releaseDate: new Date('2007-08-17'),
                        category: comedyCategory._id,
                        imageUrl: 'https://image.tmdb.org/t/p/w500/ek8e8txUyUwd2BNqj6lFEerJfbq.jpg',
                    },
                    {
                        title: 'The Grand Budapest Hotel',
                        description: 'A writer encounters the owner of an aging high-class hotel, who tells of his early years serving as a lobby boy.',
                        releaseDate: new Date('2014-03-28'),
                        category: comedyCategory._id,
                        imageUrl: 'https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg',
                    },
                    {
                        title: 'Knives Out',
                        description: 'A detective investigates the death of a patriarch of an eccentric, combative family.',
                        releaseDate: new Date('2019-11-27'),
                        category: comedyCategory._id,
                        imageUrl: 'https://image.tmdb.org/t/p/w500/pThyQovXQrw2m0s9x82twj48Jq4.jpg',
                    },

                    // Animated Movies
                    {
                        title: 'Spirited Away',
                        description: 'During her family\'s move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods and witches.',
                        releaseDate: new Date('2001-07-20'),
                        category: animatedCategory._id,
                        imageUrl: 'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
                    },
                    {
                        title: 'Inside Out',
                        description: 'After young Riley is uprooted from her Midwest life, her emotions conflict on how best to navigate a new city, house, and school.',
                        releaseDate: new Date('2015-06-19'),
                        category: animatedCategory._id,
                        imageUrl: 'https://image.tmdb.org/t/p/w500/2H1TmgdfNtsKlU9jKdeNyYL5y8T.jpg',
                    },
                    {
                        title: 'Spider-Man: Into the Spider-Verse',
                        description: 'Teen Miles Morales becomes Spider-Man of his reality, crossing his path with five counterparts from other dimensions.',
                        releaseDate: new Date('2018-12-14'),
                        category: animatedCategory._id,
                        imageUrl: 'https://image.tmdb.org/t/p/w500/iiZZdoQBEYBv6id8su7ImL0oCbD.jpg',
                    },
                ];

                await this.movieModel.insertMany(sampleMovies);
                this.logger.log(`Successfully seeded ${sampleMovies.length} movies`);
            } else {
                this.logger.log(`Movies already exist (${existingMovies} found), skipping seed`);
            }
        } catch (error) {
            this.logger.error('Error seeding movies:', error);
        }
    }

    async findAll(): Promise<MovieDocument[]> {
        return this.movieModel
            .find()
            .populate('category')
            .sort({ releaseDate: -1 })
            .exec();
    }

    async searchMovies(query: string): Promise<MovieDocument[]> {
        if (!query || query.trim().length === 0) {
            return this.findAll();
        }

        // Use MongoDB text search
        return this.movieModel
            .find({
                $text: { $search: query }
            })
            .populate('category')
            .sort({ score: { $meta: 'textScore' } })
            .exec();
    }

    async findById(id: string): Promise<MovieDocument | null> {
        return this.movieModel.findById(id).populate('category').exec();
    }

    async findByCategory(categoryId: string): Promise<MovieDocument[]> {
        return this.movieModel
            .find({ category: categoryId })
            .populate('category')
            .sort({ releaseDate: -1 })
            .exec();
    }

    async create(movieData: Partial<Movie>): Promise<MovieDocument> {
        const movie = new this.movieModel(movieData);
        return movie.save();
    }

    async update(id: string, movieData: Partial<Movie>): Promise<MovieDocument | null> {
        return this.movieModel
            .findByIdAndUpdate(id, movieData, { new: true })
            .populate('category')
            .exec();
    }

    async delete(id: string): Promise<MovieDocument | null> {
        return this.movieModel.findByIdAndDelete(id).exec();
    }

    async count(): Promise<number> {
        return this.movieModel.countDocuments().exec();
    }
}