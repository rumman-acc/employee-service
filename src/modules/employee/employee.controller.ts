import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Delete,
} from '@nestjs/common';
import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { EmployeeStatus, EmploymentType } from './entities/employee.entity';

@Controller('employees')
export class EmployeeController {
  constructor(private readonly service: EmployeeService) { }

  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('department') department?: string,
    @Query('status') status?: EmployeeStatus,
    @Query('employmentType') employmentType?: EmploymentType,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    return this.service.findAll({
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      search,
      department,
      status,
      employmentType,
      sortBy,
      sortOrder,
    });
  }
  
  @Get('dashboard')
  async getDashboard() {
    return this.service.getDashboardStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

}