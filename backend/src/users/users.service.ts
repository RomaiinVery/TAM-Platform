import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateUserDto) {
    try {
      return await this.prisma.user.create({ data });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictException('adresse already exists');
      throw e;
    }
  }

  async findByAdresse(adresse: string) {
    const user = await this.prisma.user.findUnique({ where: { adresse } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async removeByAdresse(adresse: string) {
    try {
      return await this.prisma.user.delete({ where: { adresse } });
    } catch {
      throw new NotFoundException('User not found');
    }
  }

  async updateKycByAdresse(adresse: string, kyc: number) {
    // Vérifie existence (pour renvoyer 404 plutôt que créer implicitement)
    const exists = await this.prisma.user.findUnique({ where: { adresse } });
    if (!exists) throw new NotFoundException('User not found');

    return this.prisma.user.update({
        where: { adresse },
        data: { kyc },
    });
  }
}
