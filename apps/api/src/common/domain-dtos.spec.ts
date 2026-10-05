import { type ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { CreateGoalDto, UpdateGoalDto } from '../goals/dto/goal.dto';
import {
  CreateProjectDto,
  UpdateProjectDto,
} from '../projects/dto/project.dto';
import {
  CreateTaskDto,
  ListTasksQueryDto,
  UpdateTaskDto,
} from '../tasks/dto/task.dto';

// Same options as configureApp().
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

async function errorsFor(
  metatype: ArgumentMetadata['metatype'],
  value: unknown,
): Promise<string[]> {
  try {
    await pipe.transform(value, { type: 'body', metatype });
    return [];
  } catch (error) {
    return (error as { getResponse(): { message: string[] } }).getResponse()
      .message;
  }
}

const UUID = '6f1c3c1e-8a6b-4e8e-9d55-3f5a0e2b7c11';

describe('Project DTOs', () => {
  it('trims the name and rejects a blank one', async () => {
    expect(await errorsFor(CreateProjectDto, { name: '   ' })).toContain(
      'name should not be empty',
    );
  });

  it('rejects an unknown status and a client-supplied ownerId', async () => {
    const errors = await errorsFor(CreateProjectDto, {
      name: 'P',
      status: 'DONE',
      ownerId: UUID,
    });
    expect(errors).toContainEqual(expect.stringMatching(/^status must be/));
    expect(errors).toContain('property ownerId should not exist');
  });

  it('rejects names over 200 characters', async () => {
    expect(
      await errorsFor(CreateProjectDto, { name: 'x'.repeat(201) }),
    ).toContain('name must be shorter than or equal to 200 characters');
  });

  it('PATCH: null is rejected for name but allowed for description', async () => {
    expect(await errorsFor(UpdateProjectDto, { name: null })).not.toHaveLength(
      0,
    );
    expect(await errorsFor(UpdateProjectDto, { description: null })).toEqual(
      [],
    );
    expect(await errorsFor(UpdateProjectDto, {})).toEqual([]);
  });
});

describe('Task DTOs', () => {
  it('accepts a full valid payload', async () => {
    expect(
      await errorsFor(CreateTaskDto, {
        title: 'T',
        description: 'd',
        projectId: UUID,
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        dueAt: '2026-10-31T17:00:00Z',
      }),
    ).toEqual([]);
  });

  it('rejects client-supplied completedAt and ownerId', async () => {
    const errors = await errorsFor(CreateTaskDto, {
      title: 'T',
      completedAt: '2026-10-31T17:00:00Z',
      ownerId: UUID,
    });
    expect(errors).toContain('property completedAt should not exist');
    expect(errors).toContain('property ownerId should not exist');
  });

  it.each([
    ['2026-10-31', 'date without time'],
    ['2026-10-31T17:00:00', 'no timezone'],
    ['2026-13-01T00:00:00Z', 'impossible month'],
    ['tomorrow', 'free text'],
  ])('rejects dueAt %p (%s)', async (dueAt) => {
    expect(
      await errorsFor(CreateTaskDto, { title: 'T', dueAt }),
    ).toContainEqual(
      expect.stringMatching(/^dueAt must be an ISO 8601 timestamp/),
    );
  });

  it('rejects invalid enums and a non-UUID projectId', async () => {
    const errors = await errorsFor(CreateTaskDto, {
      title: 'T',
      status: 'DONE',
      priority: 'CRITICAL',
      projectId: '123',
    });
    expect(errors).toContainEqual(expect.stringMatching(/^status must be/));
    expect(errors).toContainEqual(expect.stringMatching(/^priority must be/));
    expect(errors).toContain('projectId must be a UUID');
  });

  it('PATCH: null rejected for title/status/priority, allowed for projectId/dueAt', async () => {
    for (const field of ['title', 'status', 'priority']) {
      expect(
        await errorsFor(UpdateTaskDto, { [field]: null }),
      ).not.toHaveLength(0);
    }
    expect(
      await errorsFor(UpdateTaskDto, {
        projectId: null,
        dueAt: null,
        description: null,
      }),
    ).toEqual([]);
  });

  it('validates list filters', async () => {
    expect(
      await errorsFor(ListTasksQueryDto, {
        status: 'TODO',
        priority: 'LOW',
        projectId: UUID,
      }),
    ).toEqual([]);
    const errors = await errorsFor(ListTasksQueryDto, {
      status: 'nope',
      ownerId: UUID,
    });
    expect(errors).toContainEqual(expect.stringMatching(/^status must be/));
    expect(errors).toContain('property ownerId should not exist');
  });
});

describe('Goal DTOs', () => {
  it('accepts a valid date-only targetDate', async () => {
    expect(
      await errorsFor(CreateGoalDto, { title: 'G', targetDate: '2028-02-29' }),
    ).toEqual([]);
  });

  it.each(['2027-02-29', '2027-1-5', '2027-01-05T00:00:00Z', 'soon'])(
    'rejects targetDate %p',
    async (targetDate) => {
      expect(
        await errorsFor(CreateGoalDto, { title: 'G', targetDate }),
      ).toContain('targetDate must be a date in YYYY-MM-DD format');
    },
  );

  it('PATCH: null rejected for title, allowed for targetDate', async () => {
    expect(await errorsFor(UpdateGoalDto, { title: null })).not.toHaveLength(0);
    expect(await errorsFor(UpdateGoalDto, { targetDate: null })).toEqual([]);
  });
});
