import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('Sprint Management System E2E Workflow', () => {
  let app: INestApplication;
  let adminToken: string;
  let omarToken: string;
  let omarId: string;
  let backendTrackId: string;
  let frontendTrackId: string;
  let flutterTrackId: string;
  let sprintId: string;
  let backendChatId: string;
  let frontendChatId: string;
  let generalChatId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // 0. DEFAULT ROUTE
  describe('Default Route', () => {
    it('GET / returns 200 and default greeting message', async () => {
      const res = await request(app.getHttpServer()).get('/').expect(200);

      expect(res.body.data).toBe('Hello World!');
    });
  });

  // 1. AUTHENTICATION
  describe('Authentication', () => {
    it('Admin can login and receives valid JWT token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@sprints.com', password: 'password123' })
        .expect(201);

      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('ADMIN');
      adminToken = res.body.data.token;
    });

    it('Student (Omar) can login and receives valid JWT token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'omar@sprints.com', password: 'password123' })
        .expect(201);

      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('STUDENT');
      omarToken = res.body.data.token;
      omarId = res.body.data.user.id;
      backendTrackId = res.body.data.user.trackId;
    });

    it('Public registration MUST ALWAYS create a STUDENT and ignore client role selection', async () => {
      const uniqueEmail = `test.student.${Date.now()}@sprints.com`;
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'New Registered Student',
          email: uniqueEmail,
          password: 'password123',
          role: 'ADMIN', // Should be forbidden/ignored
        })
        // Since whitelist + forbidNonWhitelisted is active, passing unexpected 'role' gets 400
        .expect(400);

      // Register without role property
      const validRes = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          name: 'New Registered Student',
          email: uniqueEmail,
          password: 'password123',
        })
        .expect(201);

      expect(validRes.body.data.user.role).toBe('STUDENT');
    });

    it('GET /auth/me returns current user profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${omarToken}`)
        .expect(200);

      expect(res.body.data.id).toBe(omarId);
      expect(res.body.data.email).toBe('omar@sprints.com');
    });
  });

  // 2. SPRINTS & AUTOMATIC GENERAL CHAT
  describe('Sprints & Automatic General Chat', () => {
    it('Student cannot create a Sprint (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/sprints')
        .set('Authorization', `Bearer ${omarToken}`)
        .send({
          name: 'Hacked Sprint',
          description: 'desc',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000).toISOString(),
        })
        .expect(403);
    });

    it('Admin creates Sprint and GENERAL chat is automatically created', async () => {
      const res = await request(app.getHttpServer())
        .post('/sprints')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Sprint 2 — Advanced Features',
          description: 'Second sprint cycle',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 86400000 * 14).toISOString(),
        })
        .expect(201);

      sprintId = res.body.data.id;
      expect(sprintId).toBeDefined();

      // Check sprint details to verify General Chat was automatically created
      const sprintRes = await request(app.getHttpServer())
        .get(`/sprints/${sprintId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const generalChat = sprintRes.body.data.chats.find(
        (c: any) => c.type === 'GENERAL',
      );
      expect(generalChat).toBeDefined();
      expect(generalChat.trackId).toBeNull();
      generalChatId = generalChat.id;
    });
  });

  // 3. TRACKS & AUTOMATIC TRACK CHAT & STUDENT ASSIGNMENT
  describe('Tracks & Automatic Track Chat', () => {
    it('Student cannot create a Track (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/tracks')
        .set('Authorization', `Bearer ${omarToken}`)
        .send({
          name: 'Unauthorized Track',
          description: 'desc',
          sprintId,
        })
        .expect(403);
    });

    it('Admin creates Track and TRACK chat is automatically created', async () => {
      const res = await request(app.getHttpServer())
        .post('/tracks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'DevOps Track',
          description: 'CI/CD and infrastructure',
          sprintId,
        })
        .expect(201);

      const newTrackId = res.body.data.id;

      // Verify Track Chat was automatically created
      const trackRes = await request(app.getHttpServer())
        .get(`/tracks/${newTrackId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const trackChat = trackRes.body.data.chats.find(
        (c: any) => c.type === 'TRACK',
      );
      expect(trackChat).toBeDefined();
      expect(trackChat.trackId).toBe(newTrackId);
    });

    it('Admin assigns student to a Track (moves student)', async () => {
      // Fetch existing tracks
      const tracksRes = await request(app.getHttpServer())
        .get('/tracks')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const frontendTrack = tracksRes.body.data.find(
        (t: any) => t.name === 'Frontend Track',
      );
      frontendTrackId = frontendTrack.id;

      const flutterTrack = tracksRes.body.data.find(
        (t: any) => t.name === 'Flutter Track',
      );
      flutterTrackId = flutterTrack.id;

      // Assign student Omar to Frontend Track
      const assignRes = await request(app.getHttpServer())
        .patch(`/tracks/${frontendTrackId}/assign-student`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ studentId: omarId })
        .expect(200);

      expect(assignRes.body.data.user.trackId).toBe(frontendTrackId);

      // Reassign Omar back to Backend Track for subsequent task tests
      await request(app.getHttpServer())
        .patch(`/tracks/${backendTrackId}/assign-student`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ studentId: omarId })
        .expect(200);
    });
  });

  // 4. TASK ASSIGNMENT VALIDATION & STRICT WORKFLOW
  describe('Tasks & Strict Status Lifecycle', () => {
    let createdTaskId: string;

    it('Admin cannot assign student to a Task in a mismatched Track (400 Bad Request)', async () => {
      // Omar is in Backend Track. Attempting to assign Omar to Frontend Track Task.
      await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Frontend Button Design',
          description: 'Design button',
          trackId: frontendTrackId,
          assigneeId: omarId, // Mismatched!
        })
        .expect(400);
    });

    it('Admin assigns student to a Task in their matching Track (Success)', async () => {
      const res = await request(app.getHttpServer())
        .post('/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Implement Payment Gateway',
          description: 'Integrate Stripe SDK',
          trackId: backendTrackId,
          assigneeId: omarId,
        })
        .expect(201);

      expect(res.body.data.status).toBe('TODO');
      expect(res.body.data.assigneeId).toBe(omarId);
      createdTaskId = res.body.data.id;
    });

    it('Student only sees Tasks assigned to them by default', async () => {
      const res = await request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${omarToken}`)
        .expect(200);

      const tasks = res.body.data;
      expect(Array.isArray(tasks)).toBe(true);
      // All tasks returned must belong to Omar
      tasks.forEach((t: any) => {
        expect(t.assigneeId).toBe(omarId);
      });
    });

    it('Transition: TODO -> IN_PROGRESS is allowed', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/tasks/${createdTaskId}/status`)
        .set('Authorization', `Bearer ${omarToken}`)
        .send({ status: 'IN_PROGRESS' })
        .expect(200);

      expect(res.body.data.status).toBe('IN_PROGRESS');
    });

    it('Transition: Invalid direct status change is rejected (400 Bad Request)', async () => {
      // Trying to move directly or with wrong status on /status endpoint
      await request(app.getHttpServer())
        .patch(`/tasks/${createdTaskId}/status`)
        .set('Authorization', `Bearer ${omarToken}`)
        .send({ status: 'APPROVED' })
        .expect(400);
    });

    it('Transition: IN_PROGRESS -> SUBMITTED via submit endpoint by assigned student', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/tasks/${createdTaskId}/submit`)
        .set('Authorization', `Bearer ${omarToken}`)
        .send({
          submissionNotes:
            'Completed payment integration with webhook handling.',
          submissionUrl: 'https://github.com/sprints/backend/pull/99',
        })
        .expect(200);

      expect(res.body.data.status).toBe('SUBMITTED');
      expect(res.body.data.submissionNotes).toContain('Completed payment');
    });

    it('Student cannot review Task (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .patch(`/tasks/${createdTaskId}/review`)
        .set('Authorization', `Bearer ${omarToken}`)
        .send({
          approved: true,
          score: 100,
        })
        .expect(403);
    });

    it('Review: Score exceeding 100 is rejected (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .patch(`/tasks/${createdTaskId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approved: true,
          score: 150,
          feedback: 'Too high',
        })
        .expect(400);
    });

    it('Transition: Admin requests changes -> SUBMITTED moves to IN_PROGRESS', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/tasks/${createdTaskId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approved: false,
          feedback: 'Please add unit tests for the webhook handler.',
        })
        .expect(200);

      expect(res.body.data.status).toBe('IN_PROGRESS');
      expect(res.body.data.feedback).toBe(
        'Please add unit tests for the webhook handler.',
      );
    });

    it('Student re-submits Task: IN_PROGRESS -> SUBMITTED', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/tasks/${createdTaskId}/submit`)
        .set('Authorization', `Bearer ${omarToken}`)
        .send({
          submissionNotes: 'Added 100% test coverage on webhook.',
        })
        .expect(200);

      expect(res.body.data.status).toBe('SUBMITTED');
    });

    it('Transition: Admin approves Task -> SUBMITTED moves to APPROVED with score and feedback', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/tasks/${createdTaskId}/review`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          approved: true,
          score: 100,
          feedback: 'Perfect execution!',
        })
        .expect(200);

      expect(res.body.data.status).toBe('APPROVED');
      expect(res.body.data.score).toBe(100);
      expect(res.body.data.feedback).toBe('Perfect execution!');
    });
  });

  // 5. CHAT SYSTEM & ACCESS AUTHORIZATION
  describe('Chat Authorization & Messaging', () => {
    beforeAll(async () => {
      // Retrieve chats from database
      const allChatsRes = await request(app.getHttpServer())
        .get('/chats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const chats = allChatsRes.body.data;
      backendChatId = chats.find(
        (c: any) => c.track?.name === 'Backend Track',
      ).id;
      frontendChatId = chats.find(
        (c: any) => c.track?.name === 'Frontend Track',
      ).id;
    });

    it('Student can access their own Track chat and send messages', async () => {
      const sendRes = await request(app.getHttpServer())
        .post(`/chats/${backendChatId}/messages`)
        .set('Authorization', `Bearer ${omarToken}`)
        .send({ content: 'Hello Backend team, ready for Sprint review.' })
        .expect(201);

      expect(sendRes.body.data.content).toBe(
        'Hello Backend team, ready for Sprint review.',
      );
      expect(sendRes.body.data.senderId).toBe(omarId);

      // Student retrieves messages
      const getRes = await request(app.getHttpServer())
        .get(`/chats/${backendChatId}/messages`)
        .set('Authorization', `Bearer ${omarToken}`)
        .expect(200);

      expect(Array.isArray(getRes.body.data)).toBe(true);
      expect(getRes.body.data.length).toBeGreaterThan(0);
    });

    it("Student CANNOT access another Track's private chat (403 Forbidden)", async () => {
      // Omar is Backend student, trying to read Frontend Track chat
      await request(app.getHttpServer())
        .get(`/chats/${frontendChatId}/messages`)
        .set('Authorization', `Bearer ${omarToken}`)
        .expect(403);

      // Omar trying to send message to Frontend Track chat
      await request(app.getHttpServer())
        .post(`/chats/${frontendChatId}/messages`)
        .set('Authorization', `Bearer ${omarToken}`)
        .send({ content: 'I should not be allowed here' })
        .expect(403);
    });

    it('Admin can access all Track chats and send messages', async () => {
      const sendRes = await request(app.getHttpServer())
        .post(`/chats/${frontendChatId}/messages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ content: 'Dr. Tarek checking in on Frontend.' })
        .expect(201);

      expect(sendRes.body.data.content).toBe(
        'Dr. Tarek checking in on Frontend.',
      );

      const getRes = await request(app.getHttpServer())
        .get(`/chats/${frontendChatId}/messages`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(getRes.body.data)).toBe(true);
    });
  });
});
