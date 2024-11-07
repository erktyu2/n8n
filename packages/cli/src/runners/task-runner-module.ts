import { TaskRunnersConfig } from '@n8n/config';
import * as a from 'node:assert/strict';
import Container, { Service } from 'typedi';

import type { TaskRunnerProcess } from '@/runners/task-runner-process';

import { RunnerLifecycleEvents } from './runner-lifecycle-manager';
import { TaskRunnerWsServer } from './runner-ws-server';
import type { LocalTaskManager } from './task-managers/local-task-manager';
import type { TaskRunnerServer } from './task-runner-server';

/**
 * Module responsible for loading and starting task runner. Task runner can be
 * run either internally (=launched by n8n as a child process) or externally
 * (=launched by some other orchestrator)
 */
@Service()
export class TaskRunnerModule {
	private taskRunnerHttpServer: TaskRunnerServer | undefined;

	private taskRunnerWsServer: TaskRunnerWsServer | undefined;

	private taskManager: LocalTaskManager | undefined;

	private taskRunnerProcess: TaskRunnerProcess | undefined;

	constructor(
		private readonly runnerConfig: TaskRunnersConfig,
		private readonly lifecycleEvents: RunnerLifecycleEvents,
	) {
		this.lifecycleEvents.on('runner:started', async () => {
			const { InternalTaskRunnerDisconnectAnalyzer } = await import(
				'@/runners/internal-task-runner-disconnect-analyzer'
			);
			this.taskRunnerWsServer?.setDisconnectAnalyzer(
				Container.get(InternalTaskRunnerDisconnectAnalyzer),
			);
		});

		this.lifecycleEvents.on('runner:stopped', () => {
			this.taskRunnerWsServer?.setDisconnectAnalyzer(undefined);
		});
	}

	async start() {
		a.ok(this.runnerConfig.enabled, 'Task runner is disabled');

		await this.loadTaskManager();
		await this.loadTaskRunnerServer();
	}

	async stop() {
		if (this.taskRunnerProcess) {
			await this.taskRunnerProcess.stop();
			this.taskRunnerProcess = undefined;
		}

		if (this.taskRunnerHttpServer) {
			await this.taskRunnerHttpServer.stop();
			this.taskRunnerHttpServer = undefined;
		}
	}

	private async loadTaskManager() {
		const { TaskManager } = await import('@/runners/task-managers/task-manager');
		const { LocalTaskManager } = await import('@/runners/task-managers/local-task-manager');
		this.taskManager = Container.get(LocalTaskManager);
		Container.set(TaskManager, this.taskManager);
	}

	private async loadTaskRunnerServer() {
		// These are imported dynamically because we need to set the task manager
		// instance before importing them
		const { TaskRunnerServer } = await import('@/runners/task-runner-server');
		this.taskRunnerHttpServer = Container.get(TaskRunnerServer);
		this.taskRunnerWsServer = Container.get(TaskRunnerWsServer);

		await this.taskRunnerHttpServer.start();
	}
}
