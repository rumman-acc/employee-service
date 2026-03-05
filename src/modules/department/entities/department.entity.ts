import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Employee } from '../../employee/entities/employee.entity';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  budget: number;

  @Column({ nullable: true })
  location: string;

  @Column({ default: true })
  isActive: boolean;

  // ─── Relation: One Department → Many Employees ──────────────────────────
  @OneToMany(() => Employee, (employee) => employee.department)
  employees: Employee[];

  // ─── Self-referencing: Department has a Manager (who is an Employee) ────
  @Column({ nullable: true })
  managerId: string;

  @ManyToOne(() => Employee, { nullable: true, eager: false })
  @JoinColumn({ name: 'managerId' })
  manager: Employee;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}