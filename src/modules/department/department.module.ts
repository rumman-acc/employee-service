import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from './entities/department.entity';
import { Employee } from '../employee/entities/employee.entity';
import { DepartmentService } from './department.service';
import { DepartmentController } from './department.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Department, Employee])],  // register BOTH
  controllers: [DepartmentController],
  providers: [DepartmentService],
  exports: [DepartmentService],
})
export class DepartmentModule {}