import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Tasks API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let tokenUserA: string;
  let userAId: string;
  let tokenUserB: string;
  let _userBId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get<PrismaService>(PrismaService);
    await prisma.cleanDatabase();

    // Register User A
    const resA = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'usera@todoist.dev', password: 'Password123' })
      .expect(201);
    tokenUserA = resA.body.accessToken;
    userAId = resA.body.user.id;

    // Register User B
    const resB = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'userb@todoist.dev', password: 'Password123' })
      .expect(201);
    tokenUserB = resB.body.accessToken;
    _userBId = resB.body.user.id;
  });

  afterAll(async () => {
    await prisma.cleanDatabase();
    await app.close();
  });

  describe('Unauthenticated Access (FR-AUTH-005)', () => {
    it('should reject unauthenticated POST /api/v1/tasks with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .send({ title: 'Unauthorized Task' })
        .expect(401);
    });

    it('should reject unauthenticated GET /api/v1/tasks with 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/tasks').expect(401);
    });

    it('should reject unauthenticated GET /api/v1/tasks/:id with 401', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('should reject unauthenticated PATCH /api/v1/tasks/:id with 401', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
        .send({ title: 'New' })
        .expect(401);
    });

    it('should reject unauthenticated DELETE /api/v1/tasks/:id with 401', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });
  });

  let taskAId: string;
  let subtaskAId: string;

  describe('Create Task (FR-TASK-001)', () => {
    it('should create a task successfully with valid fields (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'Parent Task A',
          description: '# Task Header\nDetails in markdown.',
          dueDate: '2026-10-15',
          dueTime: '15:30',
          priority: 1,
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.userId).toBe(userAId);
      expect(res.body.title).toBe('Parent Task A');
      expect(res.body.description).toContain('# Task Header');
      expect(res.body.priority).toBe(1);
      expect(res.body.dueDate).toBe('2026-10-15');
      expect(res.body.dueTime).toBe('15:30');
      expect(res.body.isCompleted).toBe(false);
      expect(res.body.parentTaskId).toBeNull();
      taskAId = res.body.id;
    });

    it('should default priority to 4 (P4/Default) when priority is omitted', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ title: 'Default Priority Task' })
        .expect(201);

      expect(res.body.priority).toBe(4);
    });

    it('should reject creation with empty title (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ title: '' })
        .expect(400);
    });

    it('should reject invalid priority values (< 1 or > 4) (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ title: 'Bad Priority', priority: 5 })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ title: 'Bad Priority', priority: 0 })
        .expect(400);
    });

    it('should reject invalid dueTime format with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ title: 'Bad Time', dueTime: '25:99' })
        .expect(400);
    });
  });

  describe('Subtasks & Hierarchy (FR-TASK-006)', () => {
    it('should create a child subtask referencing an existing parent task (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'Child Subtask 1',
          parentTaskId: taskAId,
        })
        .expect(201);

      expect(res.body.parentTaskId).toBe(taskAId);
      subtaskAId = res.body.id;
    });

    let grandchildId: string;

    it('should support unlimited nested depth: creating a grandchild subtask (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'Grandchild Subtask 1.1',
          parentTaskId: subtaskAId,
        })
        .expect(201);

      expect(res.body.parentTaskId).toBe(subtaskAId);
      grandchildId = res.body.id;
    });

    it('should list direct children via GET /api/v1/tasks/:id/children', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskAId}/children`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe(subtaskAId);
    });

    it('should include nested subtasks when retrieving parent task by ID', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body.subtasks).toBeDefined();
      expect(res.body.subtasks.length).toBeGreaterThanOrEqual(1);
      expect(res.body.subtasks[0].id).toBe(subtaskAId);
    });

    it('should reject self-parenting when updating a task (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ parentTaskId: taskAId })
        .expect(400);
    });

    it('should reject circular hierarchy: parent cannot be child of its own descendant (400 Bad Request)', async () => {
      // taskAId is parent of subtaskAId, subtaskAId is parent of grandchildId
      // Attempting to set taskAId.parentTaskId = grandchildId must fail with 400
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ parentTaskId: grandchildId })
        .expect(400);
    });

    it('should allow detaching a child to become a root task by setting parentTaskId to null', async () => {
      // Detach grandchild
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${grandchildId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ parentTaskId: null })
        .expect(200);

      expect(res.body.parentTaskId).toBeNull();

      // Re-attach grandchild under subtaskAId for downstream tests
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${grandchildId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ parentTaskId: subtaskAId })
        .expect(200);
    });

    it('should maintain independent completion: completing subtask does not complete parent', async () => {
      // Complete subtask
      const subRes = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${subtaskAId}/complete`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(subRes.body.isCompleted).toBe(true);

      // Verify parent remains uncompleted
      const parentRes = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(parentRes.body.isCompleted).toBe(false);

      // Reopen subtask
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${subtaskAId}/complete`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);
    });
  });

  describe('Update Task & Completion (FR-TASK-003, FR-TASK-004)', () => {
    it('should partially update task and preserve unspecified fields (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ title: 'Updated Title for Task A' })
        .expect(200);

      expect(res.body.title).toBe('Updated Title for Task A');
      // Preserves original fields
      expect(res.body.priority).toBe(1);
      expect(res.body.dueDate).toBe('2026-10-15');
      expect(res.body.dueTime).toBe('15:30');
    });

    it('should toggle completion status with /complete endpoint (200)', async () => {
      // Toggle to complete
      const res1 = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskAId}/complete`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res1.body.isCompleted).toBe(true);

      // Toggle back to incomplete
      const res2 = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskAId}/complete`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res2.body.isCompleted).toBe(false);
    });
  });

  describe('Strict Multi-Tenant Authorization & Data Isolation (FR-AUTHZ-001)', () => {
    it('should not allow User B to retrieve User A tasks in list (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('should not allow User B to retrieve User A task by ID (returns 404)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskAId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(404);
    });

    it('should not allow User B to update User A task (returns 404)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskAId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({ title: 'Hacked Title' })
        .expect(404);

      // Verify User A task remained unchanged
      const check = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);
      expect(check.body.title).toBe('Updated Title for Task A');
    });

    it('should not allow User B to toggle complete User A task (returns 404)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskAId}/complete`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(404);
    });

    it('should not allow User B to delete User A task (returns 404)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskAId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(404);
    });

    it('should not allow User B to create a subtask under User A parent task (returns 404)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({
          title: 'Cross-user subtask attempt',
          parentTaskId: taskAId,
        })
        .expect(404);
    });
  });

  describe('Delete Task & Cascade Semantics (FR-TASK-005, System Design 9.3)', () => {
    it('should allow User A to delete own parent task and cascade delete subtasks (200)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/tasks/${taskAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      // Parent task is deleted
      await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(404);

      // Child subtask is also deleted via database cascade
      await request(app.getHttpServer())
        .get(`/api/v1/tasks/${subtaskAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(404);
    });
  });

  describe('Basic Search API (FR-SRCH-001, FR-AUTHZ-001)', () => {
    let searchProjectId: string;
    let searchSectionId: string;
    let searchLabelId: string;
    let taskSearch1Id: string;
    let taskSearch2Id: string;

    beforeAll(async () => {
      // Create Project for User A
      const projRes = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'Placement Prep', color: '#6957d9' })
        .expect(201);
      searchProjectId = projRes.body.id;

      // Create Section in Project for User A
      const secRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${searchProjectId}/sections`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'DSA Module', order: 1 })
        .expect(201);
      searchSectionId = secRes.body.id;

      // Create Label for User A
      const lblRes = await request(app.getHttpServer())
        .post('/api/v1/labels')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'Algorithms', color: '#3b82f6' })
        .expect(201);
      searchLabelId = lblRes.body.id;

      // Create Task 1: in project and section
      const t1 = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'Practice Java Arrays',
          description: 'Solve two sum and binary search problems',
          projectId: searchProjectId,
          sectionId: searchSectionId,
        })
        .expect(201);
      taskSearch1Id = t1.body.id;

      // Create Task 2: with label and distinct description
      const t2 = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'Review System Architecture',
          description: 'Check Postgres connection pooling metrics',
          labelIds: [searchLabelId],
        })
        .expect(201);
      taskSearch2Id = t2.body.id;
    });

    it('should search tasks by title (case-insensitive) (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks/search?q=java')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const ids = res.body.map((t: any) => t.id);
      expect(ids).toContain(taskSearch1Id);
      expect(ids).not.toContain(taskSearch2Id);
    });

    it('should search tasks by description (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks/search?q=Postgres')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const ids = res.body.map((t: any) => t.id);
      expect(ids).toContain(taskSearch2Id);
      expect(ids).not.toContain(taskSearch1Id);
    });

    it('should search tasks by project name (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks/search?q=Placement')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const ids = res.body.map((t: any) => t.id);
      expect(ids).toContain(taskSearch1Id);
    });

    it('should search tasks by section name (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks/search?q=DSA')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const ids = res.body.map((t: any) => t.id);
      expect(ids).toContain(taskSearch1Id);
    });

    it('should search tasks by label name (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks/search?q=Algorithms')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const ids = res.body.map((t: any) => t.id);
      expect(ids).toContain(taskSearch2Id);
    });

    it('should return empty array when query does not match any task (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks/search?q=NonExistentQueryXYZ123')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('should return empty array for empty query string (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks/search?q=')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });

    it('should strictly isolate search results: User B cannot search User A tasks (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks/search?q=Java')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });

  describe('Board & Calendar View Operations (Milestone 5)', () => {
    let boardProject: any;
    let sectionTodo: any;
    let sectionInProgress: any;
    let userBProject: any;
    let userBSection: any;
    let taskForBoard: any;

    beforeAll(async () => {
      // 1. Create a project for User A
      const projRes = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'Board Test Project', color: '#6957d9' })
        .expect(201);
      boardProject = projRes.body;

      // 2. Create sections for User A project
      const sec1Res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${boardProject.id}/sections`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'Todo' })
        .expect(201);
      sectionTodo = sec1Res.body;

      const sec2Res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${boardProject.id}/sections`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'In Progress' })
        .expect(201);
      sectionInProgress = sec2Res.body;

      // 3. Create a project and section for User B
      const bProjRes = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({ name: 'User B Project' })
        .expect(201);
      userBProject = bProjRes.body;

      const bSecRes = await request(app.getHttpServer())
        .post(`/api/v1/projects/${userBProject.id}/sections`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({ name: 'User B Section' })
        .expect(201);
      userBSection = bSecRes.body;

      // 4. Create a task in Todo section for User A
      const taskRes = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'Kanban Card 1',
          projectId: boardProject.id,
          sectionId: sectionTodo.id,
          dueDate: '2026-10-15',
        })
        .expect(201);
      taskForBoard = taskRes.body;
    });

    it('should verify task starts in Todo section (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tasks/${taskForBoard.id}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body.sectionId).toBe(sectionTodo.id);
      expect(res.body.section.name).toBe('Todo');
    });

    it('should move task to In Progress section via PATCH sectionId (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskForBoard.id}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ sectionId: sectionInProgress.id })
        .expect(200);

      expect(res.body.sectionId).toBe(sectionInProgress.id);
      expect(res.body.section.name).toBe('In Progress');
    });

    it('should move task to No Section (unsectioned) by setting sectionId to null (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskForBoard.id}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ sectionId: null })
        .expect(200);

      expect(res.body.sectionId).toBeNull();
      expect(res.body.section).toBeNull();
    });

    it('should reject moving task to another user section (404)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskForBoard.id}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ sectionId: userBSection.id })
        .expect(404);
    });

    it('should prevent User B from moving User A task (404)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskForBoard.id}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({ sectionId: userBSection.id })
        .expect(404);
    });

    it('should update task dueDate and dueTime for Calendar view (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskForBoard.id}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ dueDate: '2026-10-25', dueTime: '15:30' })
        .expect(200);

      expect(res.body.dueDate).toContain('2026-10-25');
      expect(res.body.dueTime).toBe('15:30');
    });

    it('should clear task dueDate and dueTime to make it unscheduled (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${taskForBoard.id}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ dueDate: null, dueTime: null })
        .expect(200);

      expect(res.body.dueDate).toBeNull();
      expect(res.body.dueTime).toBeNull();
    });
  });

  describe('Projects API CRUD & Cross-User Data Isolation (FR-PROJ-001, FR-AUTHZ-001)', () => {
    let projectAId: string;

    it('should reject unauthenticated project creation (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/projects')
        .send({ name: 'Secret' })
        .expect(401);
    });

    it('should create project for User A (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'Alpha Project', color: '#10b981' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Alpha Project');
      expect(res.body.userId).toBe(userAId);
      projectAId = res.body.id;
    });

    it('should list projects for User A and not expose them to User B (200)', async () => {
      // User A sees project
      const resA = await request(app.getHttpServer())
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);
      expect(resA.body.some((p: any) => p.id === projectAId)).toBe(true);

      // User B does NOT see project
      const resB = await request(app.getHttpServer())
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(200);
      expect(resB.body.some((p: any) => p.id === projectAId)).toBe(false);
    });

    it('should retrieve project by ID for owner (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(res.body.id).toBe(projectAId);
      expect(res.body.name).toBe('Alpha Project');
    });

    it('should prevent User B from retrieving User A project by ID (404)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectAId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(404);
    });

    it('should update project for owner (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'Alpha Project Updated' })
        .expect(200);

      expect(res.body.name).toBe('Alpha Project Updated');
    });

    it('should prevent User B from modifying User A project (404)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectAId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({ name: 'Hacked Project Name' })
        .expect(404);
    });

    it('should prevent User B from deleting User A project (404)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${projectAId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(404);
    });

    it('should allow owner to delete project (200)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${projectAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      // Verify gone
      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(404);
    });
  });

  describe('Sections API CRUD & Cross-User Data Isolation (FR-SECT-001, FR-AUTHZ-001)', () => {
    let testProject: any;
    let sectionId: string;

    beforeAll(async () => {
      const projRes = await request(app.getHttpServer())
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'Section Isolation Project' })
        .expect(201);
      testProject = projRes.body;
    });

    it('should reject unauthenticated section creation (401)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${testProject.id}/sections`)
        .send({ name: 'Unauth Section' })
        .expect(401);
    });

    it('should allow owner to create a section in project (201)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/projects/${testProject.id}/sections`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'Backlog Section', order: 1 })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Backlog Section');
      expect(res.body.projectId).toBe(testProject.id);
      sectionId = res.body.id;
    });

    it('should list sections for owner project (200)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/projects/${testProject.id}/sections`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((s: any) => s.id === sectionId)).toBe(true);
    });

    it('should prevent User B from creating a section in User A project (404)', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${testProject.id}/sections`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({ name: 'Cross-User Section Attempt' })
        .expect(404);
    });

    it('should allow owner to update section name (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/sections/${sectionId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'Active Backlog' })
        .expect(200);

      expect(res.body.name).toBe('Active Backlog');
    });

    it('should prevent User B from updating User A section (404)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/sections/${sectionId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({ name: 'Hacked Section' })
        .expect(404);
    });

    it('should prevent User B from deleting User A section (404)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/sections/${sectionId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(404);
    });

    it('should allow owner to delete section (200)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/sections/${sectionId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);
    });
  });

  describe('Labels API CRUD & Cross-User Data Isolation (FR-LBL-001, FR-AUTHZ-001)', () => {
    let labelId: string;

    it('should reject unauthenticated label creation (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/labels')
        .send({ name: 'Urgent' })
        .expect(401);
    });

    it('should create label for User A (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/labels')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'CriticalBug', color: '#ef4444' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('CriticalBug');
      expect(res.body.userId).toBe(userAId);
      labelId = res.body.id;
    });

    it('should reject duplicate label name for the same user with 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/labels')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'CriticalBug', color: '#ef4444' })
        .expect(409);
    });

    it('should allow User B to create label with same name independently (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/labels')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({ name: 'CriticalBug', color: '#3b82f6' })
        .expect(201);

      expect(res.body.name).toBe('CriticalBug');
      expect(res.body.userId).not.toBe(userAId);
    });

    it('should list labels for User A without leaking User B labels (200)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/labels')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.every((l: any) => l.userId === userAId)).toBe(true);
    });

    it('should update label for owner (200)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/labels/${labelId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ name: 'BlockerBug' })
        .expect(200);

      expect(res.body.name).toBe('BlockerBug');
    });

    it('should prevent User B from updating User A label (404)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/labels/${labelId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({ name: 'Hacked Label' })
        .expect(404);
    });

    it('should prevent User B from deleting User A label (404)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/labels/${labelId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .expect(404);
    });

    it('should allow owner to delete label (200)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/labels/${labelId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(200);
    });
  });

  describe('Nested Subtasks Deep Hierarchy & Cycle Security (Section 10)', () => {
    let rootId: string;
    let l1Id: string;
    let l2Id: string;
    let l3Id: string;

    it('should create a 4-level deep task hierarchy (Root -> L1 -> L2 -> L3)', async () => {
      // Root
      const rRes = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ title: 'Root Milestone Task' })
        .expect(201);
      rootId = rRes.body.id;

      // L1
      const l1Res = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ title: 'L1 Subtask', parentTaskId: rootId })
        .expect(201);
      l1Id = l1Res.body.id;

      // L2
      const l2Res = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ title: 'L2 Grandchild Subtask', parentTaskId: l1Id })
        .expect(201);
      l2Id = l2Res.body.id;

      // L3
      const l3Res = await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ title: 'L3 Great-Grandchild Subtask', parentTaskId: l2Id })
        .expect(201);
      l3Id = l3Res.body.id;

      expect(l3Res.body.parentTaskId).toBe(l2Id);
    });

    it('should reject circular reference: making Root a child of its own L3 descendant (400 Bad Request)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/tasks/${rootId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ parentTaskId: l3Id })
        .expect(400);
    });

    it('should reject cross-tenant attachment at deep level: User B cannot attach to User A L3 subtask (404)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/tasks')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({ title: 'User B Infiltrator Task', parentTaskId: l3Id })
        .expect(404);
    });
  });

  describe('AI Task Breakdown Endpoint (FR-AI-001, FR-AI-003)', () => {
    it('should reject unauthenticated request to /api/v1/ai/tasks/breakdown with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/ai/tasks/breakdown')
        .send({ title: 'Build portfolio' })
        .expect(401);
    });

    it('should reject request with empty title with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/ai/tasks/breakdown')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ title: '   ' })
        .expect(400);
    });

    it('should reject request with excessively long title (> 500 chars) with 400 Bad Request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/ai/tasks/breakdown')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({ title: 'A'.repeat(501) })
        .expect(400);
    });
  });

  describe('Security & Error Handling Tests (Section 14 & 17)', () => {
    it('should never expose database error trace or internal query structure on not found (404)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .expect(404);

      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('prisma');
      expect(bodyStr).not.toContain('SELECT ');
      expect(bodyStr).not.toContain('password_hash');
      expect(bodyStr).not.toContain('stack');
    });

    it('should sanitize malformed UUID parameter gracefully (400 or 404) without stack trace', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/tasks/invalid-uuid-format')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect([400, 404]).toContain(res.status);
      const bodyStr = JSON.stringify(res.body);
      expect(bodyStr).not.toContain('stack');
      expect(bodyStr).not.toContain('PostgreSQL');
    });
  });
});
