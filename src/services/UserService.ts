import { UserRepository } from "@/repositories/UserRepository";
import { User, Prisma } from "@prisma/client";

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getUserProfile(id: number): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async updateUserProfile(id: number, data: Prisma.UserUpdateInput): Promise<User> {
    return this.userRepository.update(id, data);
  }

  async getAllUsers(): Promise<User[]> {
      return this.userRepository.findAll();
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findByUsername(username);
  }
}
