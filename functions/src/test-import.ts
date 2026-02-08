import { User, AttendanceRecord } from '@detta/shared';

const testUser: User = {
    username: 'test',
    email: 'test@example.com',
    name: 'Test User',
    classId: '10A',
    role: 'student',
    createdAt: { seconds: 0, nanoseconds: 0, toDate: () => new Date() },
    inviteStatus: 'active',
    termsAcceptedAt: null,
    boundDevice: null
};

console.log(testUser);
