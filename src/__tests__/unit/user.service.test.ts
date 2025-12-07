import { UserService } from "@/services/UserService";
import { UserRepository } from "@/repositories/UserRepository";
import { User, UserRole, UserStatus } from "@prisma/client";

// Mock the UserRepository class
jest.mock("@/repositories/UserRepository");

describe("UserService", () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  const mockUser: User = {
    id: 1,
    studentId: "12345",
    username: "testuser",
    email: "test@example.com",
    passwordHash: "hashedpassword",
    role: "VOTER" as UserRole,
    status: "ACTIVE" as UserStatus,
    emailVerified: false,
    emailVerificationToken: null,
    lastLoginAt: null,
    fullName: "Test User",
    profileImage: null,
    profileImagePath: null,
    publicKey: "public-key",
    privateKeyEncrypted: "encrypted-private-key",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Instantiate service
    userService = new UserService();
    
    // Get the mock instance from the mocked constructor
    // Note: instantiating UserService calls new UserRepository(), so the mock is already used.
    // We can access the mock instance via the class mock
    mockUserRepository = (UserRepository as jest.Mock).mock.instances[0] as jest.Mocked<UserRepository>;
  });

  describe("getUserProfile", () => {
    test("should return user profile when found", async () => {
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await userService.getUserProfile(1);
      
      expect(mockUserRepository.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUser);
    });

    test("should return null when user not found", async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await userService.getUserProfile(999);
      
      expect(mockUserRepository.findById).toHaveBeenCalledWith(999);
      expect(result).toBeNull();
    });
  });

  describe("updateUserProfile", () => {
    test("should update user profile", async () => {
      const updateData = { fullName: "Updated Name" };
      const updatedUser = { ...mockUser, ...updateData };
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.updateUserProfile(1, updateData);
      
      expect(mockUserRepository.update).toHaveBeenCalledWith(1, updateData);
      expect(result).toEqual(updatedUser);
    });
  });

  describe("getAllUsers", () => {
    test("should return all users", async () => {
      mockUserRepository.findAll.mockResolvedValue([mockUser]);

      const result = await userService.getAllUsers();
      
      expect(mockUserRepository.findAll).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockUser);
    });
  });

  describe("findByUsername", () => {
    test("should return user by username", async () => {
      mockUserRepository.findByUsername.mockResolvedValue(mockUser);

      const result = await userService.findByUsername("testuser");
      
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith("testuser");
      expect(result).toEqual(mockUser);
    });

    test("should return null if username not found", async () => {
      mockUserRepository.findByUsername.mockResolvedValue(null);

      const result = await userService.findByUsername("nonexistent");
      
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith("nonexistent");
      expect(result).toBeNull();
    });
  });
});
