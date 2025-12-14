import * as fs from 'fs';
import * as path from 'path';

describe('Project Architecture & Structure', () => {
    const projectRoot = path.resolve(__dirname, '../../..');

    describe('File Structure', () => {
        const requiredFiles = [
            "src/lib/auth/password-reset.ts",
            "src/lib/auth/registration.ts",
            "src/lib/auth/voter-creation.ts",
            "src/app/api/auth/password-reset/route.ts",
            "src/app/api/auth/register/route.ts",
            "src/app/api/voters/route.ts",
        ];

        test.each(requiredFiles)('should verify existence of %s', (filePath) => {
            const fullPath = path.join(projectRoot, filePath);
            expect(fs.existsSync(fullPath)).toBe(true);
        });
    });

    describe('Module Exports', () => {
        const exportTests = [
            {
                file: "src/lib/auth/password-reset.ts",
                exports: ["PasswordResetManager", "passwordReset"]
            },
            {
                file: "src/lib/auth/registration.ts",
                exports: ["OrganizationRegistrationManager", "registration"]
            },
            {
                file: "src/lib/auth/voter-creation.ts",
                exports: ["VoterCreationManager", "voterCreation"]
            },
        ];

        test.each(exportTests)('should export required members from $file', ({ file, exports }) => {
             const fullPath = path.join(projectRoot, file);
             if (fs.existsSync(fullPath)) {
                 const content = fs.readFileSync(fullPath, 'utf8');
                 exports.forEach(exp => {
                     expect(content).toContain(exp);
                 });
             }
        });
    });

    describe('API Endpoints', () => {
       test('Password Reset API should have POST and PUT', () => {
           const filePath = path.join(projectRoot, "src/app/api/auth/password-reset/route.ts");
           if(fs.existsSync(filePath)) {
               const content = fs.readFileSync(filePath, 'utf8');
               expect(content).toContain('export async function POST');
               expect(content).toContain('export async function PUT');
           }
       });

       test('Registration API should have POST', () => {
            const filePath = path.join(projectRoot, "src/app/api/auth/register/route.ts");
            if(fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                expect(content).toContain('export async function POST');
            }
       });
    });
});
