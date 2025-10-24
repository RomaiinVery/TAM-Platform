import { Body, Controller, Delete, Get, Param, Post, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateKycDto } from './dto/update-kyc.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Get(':adresse')
  findOne(@Param('adresse') adresse: string) {
    return this.usersService.findByAdresse(adresse);
  }

  @Delete(':adresse')
  remove(@Param('adresse') adresse: string) {
    return this.usersService.removeByAdresse(adresse);
  }

  @Patch(':adresse/kyc')
  updateKyc(
    @Param('adresse') adresse: string,
    @Body() dto: UpdateKycDto,
  ) {
    return this.usersService.updateKycByAdresse(adresse, dto.kyc);
  }
}
