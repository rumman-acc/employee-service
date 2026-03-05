import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Employee,
  EmployeeStatus,
  EmploymentType,
} from './entities/employee.entity';
import { CreateEmployeeDto } from './dto/create-employee.dto';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) { }

  async create(dto: CreateEmployeeDto) {
    const existing = await this.employeeRepo.findOne({
      where: [{ email: dto.email }, { employeeCode: dto.employeeCode }],
    });

    if (existing) {
      throw new BadRequestException('Employee already exists');
    }

    const employee = this.employeeRepo.create(dto);
    return this.employeeRepo.save(employee);
  }

  async findAll(options: {
    page?: number;
    limit?: number;
    search?: string;
    department?: string;
    status?: EmployeeStatus;
    employmentType?: EmploymentType;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }) {
    const {
      page = 1,
      limit = 10,
      search,
      department,
      status,
      employmentType,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = options;

    const query = this.employeeRepo
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.department', 'department');

    /* SEARCH */

    if (search) {
      query.andWhere(
        `(employee.firstName ILIKE :search
      OR employee.lastName ILIKE :search
      OR employee.email ILIKE :search
      OR employee.employeeCode ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    /* FILTERS */

    if (department) {
      query.andWhere('department.name = :department', { department });
    }

    if (status) {
      query.andWhere('employee.status = :status', { status });
    }

    if (employmentType) {
      query.andWhere('employee.employmentType = :employmentType', {
        employmentType,
      });
    }

    /* SORTING */

    const allowedSortFields = [
      'firstName',
      'lastName',
      'email',
      'salary',
      'createdAt',
      'dateOfJoining',
    ];

    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : 'createdAt';

    query.orderBy(`employee.${safeSortBy}`, sortOrder);

    /* PAGINATION */

    query.skip((page - 1) * limit).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const employee = await this.employeeRepo
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.department', 'department')
      .where('employee.id = :id', { id: id.trim() })
      .getOne();

    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    return employee;
  }

  async update(id: string, dto: Partial<CreateEmployeeDto>) {
    const employee = await this.findOne(id);
    Object.assign(employee, dto);
    return this.employeeRepo.save(employee);
  }

  async remove(id: string) {
    const employee = await this.findOne(id);
    await this.employeeRepo.remove(employee);
    return { message: 'Employee deleted successfully' };
  }

  async getDashboardStats() {

    /* KPI COUNTS */

    const totalEmployees = await this.employeeRepo.count();

    const statusCounts = await this.employeeRepo
      .createQueryBuilder('employee')
      .select('employee.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('employee.status')
      .getRawMany();

    const kpis = {
      totalEmployees,
      active: 0,
      inactive: 0,
      onLeave: 0,
      terminated: 0,
    };

    statusCounts.forEach((row) => {
      const count = Number(row.count);

      switch (row.status) {
        case EmployeeStatus.ACTIVE:
          kpis.active = count;
          break;
        case EmployeeStatus.INACTIVE:
          kpis.inactive = count;
          break;
        case EmployeeStatus.ON_LEAVE:
          kpis.onLeave = count;
          break;
        case EmployeeStatus.TERMINATED:
          kpis.terminated = count;
          break;
      }
    });

    /* EMPLOYEES BY DEPARTMENT */

    const departmentStats = await this.employeeRepo
      .createQueryBuilder('employee')
      .leftJoin('employee.department', 'department')
      .select('department.name', 'department')
      .addSelect('COUNT(*)', 'count')
      .groupBy('department.name')
      .orderBy('count', 'DESC')
      .getRawMany();

    /* STATUS DISTRIBUTION */

    const statusStats = statusCounts.map((row) => ({
      name: row.status,
      value: Number(row.count),
    }));

    /* EMPLOYMENT TYPE DISTRIBUTION */

    const employmentTypeStats = await this.employeeRepo
      .createQueryBuilder('employee')
      .select('employee.employmentType', 'name')
      .addSelect('COUNT(*)', 'value')
      .groupBy('employee.employmentType')
      .getRawMany();

    /* AVG SALARY BY DEPARTMENT */

    const salaryStats = await this.employeeRepo
      .createQueryBuilder('employee')
      .leftJoin('employee.department', 'department')
      .select('department.name', 'department')
      .addSelect('AVG(employee.salary)', 'avgSalary')
      .where('employee.salary IS NOT NULL')
      .groupBy('department.name')
      .getRawMany();

    /* MONTHLY HIRING TREND */

    const hiringTrend = await this.employeeRepo
      .createQueryBuilder('employee')
      .select(`TO_CHAR(employee.dateOfJoining, 'YYYY-MM')`, 'month')
      .addSelect('COUNT(*)', 'count')
      .groupBy(`month`)
      .orderBy(`month`, 'ASC')
      .getRawMany();

    return {
      kpis,
      departmentStats: departmentStats.map((d) => ({
        department: d.department,
        count: Number(d.count),
      })),
      statusStats,
      employmentTypeStats: employmentTypeStats.map((e) => ({
        name: e.name,
        value: Number(e.value),
      })),
      salaryStats: salaryStats.map((s) => ({
        department: s.department,
        avgSalary: Number(s.avgSalary),
      })),
      hiringTrend: hiringTrend.map((h) => ({
        month: h.month,
        count: Number(h.count),
      })),
    };
  }
}