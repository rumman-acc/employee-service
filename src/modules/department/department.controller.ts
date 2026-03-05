import {
  Controller, Get, Post, Delete,
  Body, Param, Query, ParseUUIDPipe
} from '@nestjs/common';
import { DepartmentService } from './department.service';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Controller('departments')
export class DepartmentController {
  constructor(private readonly service: DepartmentService) {}

  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.service.create(dto);
  }

  @Get('with-employees')
  innerJoin() {
    return this.service.findAllWithEmployees();
  }

  @Get('all-with-employees')
  leftJoin() {
    return this.service.findAllWithEmployeesManager();
  }

  @Get('stats')
  stats() {
    return this.service.getDepartmentStats();
  }

  @Get('employees-with-dept')
  employeesWithDept() {
    return this.service.getEmployeesWithDepartment();
  }

  @Get('high-salary')
  highSalary(@Query('threshold') threshold: string) {
    return this.service.getHighSalaryDepartments(Number(threshold) || 50000);
  }

  @Post(':deptId/assign/:employeeId')
  assign(
    @Param('deptId', ParseUUIDPipe) deptId: string,
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
  ) {
    return this.service.assignEmployee(deptId, employeeId);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findOneWithDetails(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}