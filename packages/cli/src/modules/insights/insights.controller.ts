//import type { InsightsSummary } from '@n8n/api-types';

import type { InsightsSummary } from '@n8n/api-types';

import { Get, GlobalScope, RestController } from '@/decorators';

import { InsightsService } from './insights.service';

@RestController('/insights')
export class InsightsController {
	constructor(private readonly insightsService: InsightsService) {}

	@Get('/summary')
	@GlobalScope('insights:list')
	async getInsightsSummary(): Promise<InsightsSummary> {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return await this.insightsService.getInsightsSummary();
	}
}
