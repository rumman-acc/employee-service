import {
  IsString, IsNotEmpty, IsOptional,
  IsNumber, IsUUID, Min,
} from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  budget?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsUUID()
  @IsOptional()
  managerId?: string;           // UUID of an Employee who manages this dept
}