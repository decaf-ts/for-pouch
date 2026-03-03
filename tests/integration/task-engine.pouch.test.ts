import { ConflictError, NotFoundError } from "@decaf-ts/db-decorators";
import { Observer } from "@decaf-ts/core";
import { Repository, Repo } from "@decaf-ts/core";
import { Logging, LogLevel } from "@decaf-ts/logging";
import {
  TaskBuilder,
  TaskContext,
  TaskEngine,
  TaskEngineConfig,
  TaskEventBus,
  TaskEventModel,
  TaskEventType,
  TaskHandler,
  TaskHandlerRegistry,
  TaskLogger,
  TaskModel,
  TaskService,
  TaskStatus,
  task,
} from "@decaf-ts/core/tasks";
import { PouchAdapter } from "../../src";
import { getHttpPouch } from "../pouch";
import { NanoAdapter } from "@decaf-ts/for-nano";

jest.setTimeout(200000);

const adminUser = process.env.POUCH_ADMIN_USER || "couchdb.admin";
const adminPassword = process.env.POUCH_ADMIN_PASSWORD || "couchdb.admin";
const dbHost = process.env.POUCH_HOST || "localhost:10010";
const protocol = (process.env.POUCH_PROTOCOL as "http" | "https") || "http";
const cleanupDelayMs = Number(process.env.POUCH_CLEANUP_DELAY_MS || "250");

function randomSuffix() {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function waitForCleanup(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function createPouchTestResources(prefix: string) {
  const suffix = randomSuffix();
  const dbName = `${prefix}_${suffix}`;
  const user = `${prefix}_user_${suffix}`;
  const password = `${user}_pw`;
  const connection = NanoAdapter.connect(
    adminUser,
    adminPassword,
    dbHost,
    protocol
  );

  try {
    await NanoAdapter.createDatabase(connection, dbName);
  } catch (e: any) {
    if (!(e instanceof ConflictError)) throw e;
  }
  try {
    await NanoAdapter.createUser(connection, dbName, user, password);
  } catch (e: any) {
    if (!(e instanceof ConflictError)) throw e;
  }

  return { connection, dbName, user, password };
}

async function cleanupPouchTestResources(
  resources: Awaited<ReturnType<typeof createPouchTestResources>>
) {
  const { connection, dbName, user } = resources;
  try {
    await NanoAdapter.deleteDatabase(connection, dbName);
  } catch (e: any) {
    if (!(e instanceof NotFoundError)) throw e;
  }
  await waitForCleanup(cleanupDelayMs);
  try {
    await NanoAdapter.deleteUser(connection, dbName, user);
  } catch (e: any) {
    if (!(e instanceof NotFoundError)) throw e;
  } finally {
    NanoAdapter.closeConnection(connection);
  }
  await waitForCleanup(cleanupDelayMs);
}

const recordedEvents: TaskEventModel[] = [];

const parseNumberInput = (input: unknown): number => {
  if (typeof input === "number") return input;
  if (typeof input === "string") {
    const asNumber = Number(input);
    if (!Number.isNaN(asNumber)) return asNumber;
  }
  if (typeof input === "object" && input !== null) {
    const value = (input as { value?: unknown }).value;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const asNumber = Number(value);
      if (!Number.isNaN(asNumber)) return asNumber;
    }
  }
  throw new Error("invalid task input");
};

@task("pouch-simple-task")
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class PouchSimpleTask extends TaskHandler<number | { value: number }, number> {
  async run(value: number | { value: number }, ctx: TaskContext) {
    const parsed = parseNumberInput(value);
    ctx.logger.info(`pouch-simple-task ${parsed}`);
    await ctx.flush();
    return parsed * 3;
  }
}

@task("pouch-progress-task")
// eslint-disable-next-line @typescript-eslint/no-unused-vars
class PouchProgressTask extends TaskHandler<{ value: number }, number> {
  async run(input: { value: number }, ctx: TaskContext) {
    const parsed = parseNumberInput(input);
    ctx.logger.info("pouch-progress-task: before step 1");
    await ctx.flush();
    await ctx.progress({
      status: TaskStatus.RUNNING,
      currentStep: 1,
      totalSteps: 2,
    });
    ctx.logger.info("pouch-progress-task: before step 2");
    await ctx.flush();
    await ctx.progress({
      status: TaskStatus.RUNNING,
      currentStep: 2,
      totalSteps: 2,
    });
    ctx.logger.info("pouch-progress-task: finished");
    await ctx.flush();
    return parsed + 7;
  }
}

describe("Pouch task engine integration", () => {
  let resources:
    | Awaited<ReturnType<typeof createPouchTestResources>>
    | undefined;
  let adapter: PouchAdapter;
  let taskService: TaskService<PouchAdapter>;
  let engine: TaskEngine<PouchAdapter>;
  let taskRepo: Repo<TaskModel>;
  let eventBus: TaskEventBus;
  let registry: TaskHandlerRegistry;
  let unsubscribe: (() => void) | undefined;

  beforeAll(async () => {
    resources = await createPouchTestResources("task-engine");
    adapter = await getHttpPouch(
      resources.dbName,
      resources.user,
      resources.password,
      undefined,
      adminUser,
      adminPassword
    );
    await adapter.initialize();
    Repository.forModel(TaskModel, adapter.alias);

    eventBus = new TaskEventBus();
    registry = new TaskHandlerRegistry();

    const config: TaskEngineConfig<PouchAdapter> = {
      adapter,
      bus: eventBus,
      registry,
      workerId: "pouch-integration-worker",
      concurrency: 1,
      leaseMs: 500,
      pollMsIdle: 1000,
      pollMsBusy: 200,
      logTailMax: 200,
      streamBufferSize: 5,
      maxLoggingBuffer: 100,
      loggingBufferTruncation: 10,
      gracefulShutdownMsTimeout: 4000,
    };

    taskService = new TaskService();
    await taskService.boot(config);
    engine = taskService.client as TaskEngine<PouchAdapter>;
    await engine.start();

    taskRepo = Repository.forModel(TaskModel, adapter.alias);

    const observer: Observer = {
      async refresh(evt: TaskEventModel) {
        if (evt?.taskId) {
          recordedEvents.push(evt);
        }
      },
    };
    unsubscribe = eventBus.observe(observer);
  });

  beforeEach(() => {
    recordedEvents.length = 0;
  });

  afterAll(async () => {
    unsubscribe?.();
    await taskService.shutdown();
    await adapter.shutdown();
    if (resources) {
      await cleanupPouchTestResources(resources);
    }
  });

  const eventsFor = (taskId: string, type?: TaskEventType) =>
    recordedEvents.filter(
      (evt) =>
        evt && evt.taskId === taskId && (!type || evt.classification === type)
    );

  it("executes a task and logs status events", async () => {
    const toSubmit = new TaskBuilder()
      .setClassification("pouch-simple-task")
      .setInput({ value: 6 })
      .build();

    const { task, tracker } = await engine.push(toSubmit, true);
    const output = await tracker.resolve();

    expect(output).toBe(18);

    const persisted = await taskRepo.read(task.id);
    expect(persisted.status).toBe(TaskStatus.SUCCEEDED);
    expect(persisted.output).toBe(18);

    const statusEvents = eventsFor(task.id, TaskEventType.STATUS);
    const statusValues = statusEvents.map((evt) => evt.payload?.status);
    expect(statusValues).toEqual(
      expect.arrayContaining([TaskStatus.RUNNING, TaskStatus.SUCCEEDED])
    );
  });

  it("pipes status and progress events through the tracker", async () => {
    const capturedStatuses: TaskStatus[] = [];
    const progressPayloads: TaskEventModel[] = [];

    const composite = new TaskBuilder()
      .setClassification("pouch-progress-task")
      .setInput({ value: 3 })
      .build();

    const { tracker } = await engine.push(composite, true);

    tracker.pipe((evt) => {
      const status = evt.payload?.status ?? evt.payload;
      if (typeof status === "string") {
        capturedStatuses.push(status as TaskStatus);
      }
    }, TaskEventType.STATUS);

    tracker.pipe((evt) => {
      progressPayloads.push(evt);
    }, TaskEventType.PROGRESS);

    const output = await tracker.resolve();
    expect(output).toBe(10);

    expect(capturedStatuses).toContain(TaskStatus.SUCCEEDED);
    expect(progressPayloads.length).toBeGreaterThanOrEqual(2);
    expect(progressPayloads[0].payload).toMatchObject({
      currentStep: 1,
      totalSteps: 2,
    });
  });

  it("records task events via the TaskEventModel repository", async () => {
    const eventRepo: Repo<TaskEventModel> = Repository.forModel(
      TaskEventModel,
      adapter.alias
    );
    const composite = new TaskBuilder()
      .setClassification("pouch-progress-task")
      .setInput({ value: 2 })
      .build();

    const { task, tracker } = await engine.push(composite, true);
    await tracker.resolve();

    const allEvents = await eventRepo.select().execute();
    const taskEvents = allEvents.filter((evt) => evt.taskId === task.id);

    expect(taskEvents.length).toBeGreaterThan(0);
    expect(
      taskEvents.some((evt) => evt.classification === TaskEventType.STATUS)
    ).toBe(true);
    expect(
      taskEvents.some((evt) => evt.classification === TaskEventType.LOG)
    ).toBe(true);

    const statusPayloads = taskEvents
      .filter((evt) => evt.classification === TaskEventType.STATUS)
      .map((evt) => evt.payload?.status);
    expect(statusPayloads).toContain(TaskStatus.SUCCEEDED);
  });

  it("attaches a custom logger and flushes raw logs", async () => {
    const baseLogger = Logging.get().for("pouch-task-engine");
    const infoSpy = jest.spyOn(baseLogger, "info");
    const logger = new TaskLogger(baseLogger, 5, 10);
    const rawMessages: string[] = [];

    const toSubmit = new TaskBuilder()
      .setClassification("pouch-progress-task")
      .setInput({ value: 1 })
      .build();

    const { tracker } = await engine.push(toSubmit, true);
    tracker.pipe((evt) => {
      if (evt.classification !== TaskEventType.LOG) return;
      const logs = evt.payload as Array<{
        level: LogLevel;
        msg: string;
        meta: unknown;
      }>;

      evt.payload = logs.map(({ level, msg, meta }) => [level, msg, meta]);
    });
    tracker.attach(logger, {
      logProgress: true,
      logStatus: true,
      style: false,
    });

    tracker.logs((logs) => {
      rawMessages.push(
        ...logs.map(
          (entry: [unknown, string | undefined, unknown]) => `${entry[1] ?? ""}`
        )
      );
    });

    try {
      await tracker.resolve();

      expect(
        rawMessages.some((msg) => msg.includes("pouch-progress-task"))
      ).toBe(true);
      const infoCalls = infoSpy.mock.calls.map((call) => `${call[0] ?? ""}`);
      expect(infoCalls.some((call) => call.includes("### STATUS"))).toBe(true);
      expect(infoCalls.some((call) => call.includes("### STEP"))).toBe(true);
    } finally {
      infoSpy.mockRestore();
    }
  });
});
