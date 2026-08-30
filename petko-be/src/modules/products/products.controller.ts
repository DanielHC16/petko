import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { AuthGuard } from '@/common/guards/auth.guard'
import { RolesGuard } from '@/common/guards/roles.guard'
import { Roles } from '@/common/decorators/roles.decorator'
import { ProductsService, type ProductEntity } from './products.service'
import { CreateProductDto } from './dto/create-product.dto'
import { UpdateProductDto } from './dto/update-product.dto'

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async getAllProducts(
    @Query('category') category?: string,
    @Query('pet_type') pet_type?: string,
    @Query('search') search?: string,
    @Query('all') all?: string,
  ): Promise<ProductEntity[]> {
    return this.productsService.findAll({
      category,
      pet_type,
      search,
      all: all === 'true',
    })
  }

  @Get(':id')
  async getProductById(@Param('id') id: string): Promise<ProductEntity> {
    return this.productsService.findById(id)
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async createProduct(@Body() dto: CreateProductDto): Promise<ProductEntity> {
    return this.productsService.create(dto)
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductEntity> {
    return this.productsService.update(id, dto)
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async deleteProduct(@Param('id') id: string): Promise<{ message: string }> {
    return this.productsService.delete(id)
  }
}
