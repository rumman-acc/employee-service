import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from './entities/department.entity';
import { Employee } from '../employee/entities/employee.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentService {
  constructor(
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,

    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  // ════════════════════════════════════════════════════════════════
  //  CREATE
  // ════════════════════════════════════════════════════════════════

  async create(dto: CreateDepartmentDto) {
    const exists = await this.deptRepo.findOne({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Department name already exists');

    const dept = this.deptRepo.create(dto);
    return this.deptRepo.save(dept);
  }

  // ════════════════════════════════════════════════════════════════
  //  JOIN TYPE 1 — INNER JOIN
  //  Get only departments that HAVE at least one employee
  // ════════════════════════════════════════════════════════════════

  async findAllWithEmployees() {
    return this.deptRepo
      .createQueryBuilder('department')
      .innerJoin('department.employees', 'employee')        // INNER JOIN employees
      .addSelect([                                           // pick columns you want
        'employee.id',
        'employee.firstName',
        'employee.lastName',
        'employee.email',
      ])
      .getMany();

    /*
      Generated SQL:
      SELECT department.*, employee.id, employee.firstName ...
      FROM departments department
      INNER JOIN employees employee ON employee.departmentId = department.id
                                                                              
      ✅ Returns: only departments that have employees                        
      ❌ Excludes: empty departments                                           
    */
  }

  // ════════════════════════════════════════════════════════════════
  //  JOIN TYPE 2 — LEFT JOIN
  //  Get ALL departments, with employees if they exist
  // ════════════════════════════════════════════════════════════════

  async findAllWithEmployeesManager() {
    return this.deptRepo
      .createQueryBuilder('department')
      .leftJoinAndSelect('department.employees', 'employee') // LEFT JOIN + SELECT
      .leftJoinAndSelect('department.manager', 'manager')    // also load manager
      .orderBy('department.name', 'ASC')
      .addOrderBy('employee.firstName', 'ASC')
      .getMany();

    /*
      Generated SQL:
      SELECT department.*, employee.*, manager.*
      FROM departments department
      LEFT JOIN employees employee ON employee.departmentId = department.id
      LEFT JOIN employees manager  ON department.managerId  = manager.id
      ORDER BY department.name ASC, employee.firstName ASC

      ✅ Returns: ALL departments                                              
      ✅ Includes: employees array (empty [] if none)                          
      ✅ Includes: manager object (null if none)                               
    */
  }

  // ════════════════════════════════════════════════════════════════
  //  JOIN TYPE 3 — LEFT JOIN with WHERE filter
  //  Get one department with its employees and manager
  // ════════════════════════════════════════════════════════════════

  async findOneWithDetails(id: string) {
    const dept = await this.deptRepo
      .createQueryBuilder('department')
      .leftJoinAndSelect('department.employees', 'employee')
      .leftJoinAndSelect('department.manager', 'manager')
      .where('department.id = :id', { id })
      .getOne();

    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  // ════════════════════════════════════════════════════════════════
  //  JOIN TYPE 4 — JOIN + AGGREGATION (GROUP BY)
  //  Department stats: headcount + avg salary
  // ════════════════════════════════════════════════════════════════

  async getDepartmentStats() {
    return this.deptRepo
      .createQueryBuilder('department')
      .leftJoin('department.employees', 'employee')
      .select('department.id', 'id')
      .addSelect('department.name', 'name')
      .addSelect('department.budget', 'budget')
      .addSelect('COUNT(employee.id)', 'headcount')           // count employees
      .addSelect('AVG(employee.salary)', 'avgSalary')         // avg salary
      .addSelect('MAX(employee.salary)', 'maxSalary')         // highest salary
      .addSelect('MIN(employee.salary)', 'minSalary')         // lowest salary
      .addSelect('SUM(employee.salary)', 'totalSalaryCost')   // total cost
      .groupBy('department.id')
      .addGroupBy('department.name')
      .addGroupBy('department.budget')
      .orderBy('headcount', 'DESC')
      .getRawMany();                                          // getRawMany for aggregated

    /*
      Generated SQL:
      SELECT   department.id, department.name, department.budget,
               COUNT(employee.id)   AS headcount,
               AVG(employee.salary) AS avgSalary,
               MAX(employee.salary) AS maxSalary,
               MIN(employee.salary) AS minSalary,
               SUM(employee.salary) AS totalSalaryCost
      FROM     departments department
      LEFT JOIN employees employee ON employee.departmentId = department.id
      GROUP BY department.id, department.name, department.budget
      ORDER BY headcount DESC
    */
  }

  // ════════════════════════════════════════════════════════════════
  //  JOIN TYPE 5 — Reverse JOIN: from Employee side
  //  Get employees WITH their department loaded
  // ════════════════════════════════════════════════════════════════

  async getEmployeesWithDepartment() {
  return this.employeeRepo
    .createQueryBuilder('employee')
    .leftJoinAndSelect('employee.department', 'department')
    .orderBy('employee.firstName', 'ASC')
    .getMany();


    /*
      Generated SQL:
      SELECT employee.id, employee.firstName, employee.lastName,
             employee.email, employee.salary,
             department.id, department.name, department.location
      FROM   employees employee
      LEFT JOIN departments department ON employee.departmentId = department.id
      WHERE  employee.departmentId IS NOT NULL
      ORDER BY department.name ASC
    */
  }

  // ════════════════════════════════════════════════════════════════
  //  JOIN TYPE 6 — SUBQUERY JOIN
  //  Departments where avg salary exceeds a threshold
  // ════════════════════════════════════════════════════════════════

  async getHighSalaryDepartments(threshold: number) {
    return this.deptRepo
      .createQueryBuilder('department')
      .innerJoin(
        (subQuery) =>
          subQuery
            .select('employee.departmentId', 'deptId')
            .addSelect('AVG(employee.salary)', 'avg')
            .from(Employee, 'employee')
            .groupBy('employee.departmentId')
            .having('AVG(employee.salary) > :threshold', { threshold }),
        'salary_summary',                                     // subquery alias
        'salary_summary.deptId = department.id',              // join condition
      )
      .leftJoinAndSelect('department.employees', 'employee')
      .getMany();

    /*
      Generated SQL:
      SELECT department.*, employee.*
      FROM   departments department
      INNER JOIN (
          SELECT   employee.departmentId AS deptId,
                   AVG(employee.salary)  AS avg
          FROM     employees employee
          GROUP BY employee.departmentId
          HAVING   AVG(employee.salary) > $1
      ) salary_summary ON salary_summary.deptId = department.id
      LEFT JOIN employees employee ON employee.departmentId = department.id
    */
  }

  // ════════════════════════════════════════════════════════════════
  //  Assign an employee to a department
  // ════════════════════════════════════════════════════════════════

  async assignEmployee(deptId: string, employeeId: string) {
    const [dept, employee] = await Promise.all([
      this.deptRepo.findOne({ where: { id: deptId } }),
      this.employeeRepo.findOne({ where: { id: employeeId } }),
    ]);

    if (!dept) throw new NotFoundException('Department not found');
    if (!employee) throw new NotFoundException('Employee not found');

    employee.departmentId = deptId;
    return this.employeeRepo.save(employee);
  }

  async remove(id: string) {
    const dept = await this.deptRepo.findOne({ where: { id } });
    if (!dept) throw new NotFoundException('Department not found');
    await this.deptRepo.remove(dept);
    return { message: 'Department deleted' };
  }
}