import { Controller, Get, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CategoryResponseDto } from './dto/category-response.dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
    constructor(private categoriesService: CategoriesService) { }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get all categories',
        description: 'Retrieve a list of all movie categories available in the system'
    })
    @ApiResponse({
        status: 200,
        description: 'List of categories retrieved successfully',
        type: [CategoryResponseDto]
    })
    async findAll(): Promise<CategoryResponseDto[]> {
        const categories = await this.categoriesService.findAll();

        return categories.map(category => ({
            id: category._id.toString(),
            name: category.name,
            description: category.description,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
        }));
    }

    @Get(':id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Get category by ID',
        description: 'Retrieve a specific category by its ID'
    })
    @ApiParam({
        name: 'id',
        description: 'Category ID',
        type: 'string'
    })
    @ApiResponse({
        status: 200,
        description: 'Category retrieved successfully',
        type: CategoryResponseDto
    })
    @ApiResponse({
        status: 404,
        description: 'Category not found'
    })
    async findOne(@Param('id') id: string): Promise<CategoryResponseDto> {
        const category = await this.categoriesService.findOne(id);

        return {
            id: category._id.toString(),
            name: category.name,
            description: category.description,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
        };
    }
}