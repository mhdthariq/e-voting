import { BaseRepository } from "./BaseRepository";
import prisma from "@/lib/database/client";
import { User, Prisma } from "@prisma/client";

export class UserRepository extends BaseRepository<User, Prisma.UserCreateInput, Prisma.UserUpdateInput> {
  constructor() {
    super(prisma.user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.model.findUnique({ where: { email } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.model.findUnique({ where: { username } });
  }
  
  async findByRole(role: string): Promise<User[]> {
      return this.model.findMany({ where: { role } });
  }
}
