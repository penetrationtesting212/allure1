import { Request, Response } from 'express';
import { AppError } from '../middleware/errorHandler';
import { allureService } from '../services/allure.service';
import { playwrightExecutorService } from '../services/playwright/playwrightExecutor.service';
import pool from '../db';
import { randomUUID } from 'crypto';


/**
 * Get all test runs for a user
 */
export const getTestRuns = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { projectId } = req.query;

    let query = `SELECT tr.*, s.name AS script_name, s."projectId" AS script_project_id
       FROM "TestRun" tr
       JOIN "Script" s ON s.id = tr."scriptId"
       WHERE tr."userId" = $1`;
    
    const params = [userId];
    
    if (projectId) {
      query += ` AND s."projectId" = $2`;
      params.push(projectId as string);
    }
    
    query += ` ORDER BY tr."startedAt" DESC`;

    const { rows } = await pool.query(query, params);

    const testRuns = rows.map(r => ({
      ...r,
      script: { name: r.script_name }
    }));

    res.status(200).json({ success: true, data: testRuns });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to get test runs' });
  }
};

/**
 * Get a specific test run
 */
export const getTestRun = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT tr.*, s.name AS script_name, s.language AS script_language
       FROM "TestRun" tr
       LEFT JOIN "Script" s ON s.id = tr."scriptId"
       WHERE tr.id = $1 AND tr."userId" = $2`,
      [id, userId]
    );

    const testRun = rows[0];
    if (!testRun) throw new AppError('Test run not found', 404);

    res.status(200).json({
      success: true,
      data: {
        ...testRun,
        script: { name: testRun.script_name || 'Current Script', language: testRun.script_language || 'playwright-test' }
      }
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || 'Failed to get test run' });
    }
  }
};

/**
 * Start a new test run
 */
export const startTestRun = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { scriptId, dataFileId: _dataFileId, environment, browser } = req.body;

    if (!scriptId) throw new AppError('Script ID is required', 400);

    const scriptRes = await pool.query(
      `SELECT id, name FROM "Script" WHERE id = $1 AND "userId" = $2`,
      [scriptId, userId]
    );
    const script = scriptRes.rows[0];
    if (!script) throw new AppError('Script not found', 404);

    const id = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO "TestRun" (id, "scriptId", "userId", status, environment, browser, "startedAt")
       VALUES ($1, $2, $3, 'queued', COALESCE($4, 'development'), COALESCE($5, 'chromium'), now())
       RETURNING *`,
      [id, scriptId, userId, environment ?? null, browser ?? null]
    );
    const testRun = rows[0];

    try {
      await allureService.startTest(testRun.id, script.name);
    } catch (error) {
      console.error('Failed to start Allure test:', error);
    }

    // Execute Playwright script asynchronously
    executePlaywrightScript(testRun.id, script.code, script.name, browser ?? 'chromium', environment ?? 'development').catch((error: any) => {
      console.error('Failed to execute Playwright script:', error);
    });

    res.status(201).json({ success: true, data: testRun });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || 'Failed to start test run' });
    }
  }
};

/**
 * Execute current script code directly (without saving to database)
 */
export const executeCurrentScript = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { code, language, environment, browser } = req.body;

    if (!code || !language) throw new AppError('Code and language are required', 400);

    // Create a temporary script ID for tracking
    const tempScriptId = randomUUID();
    
    // Create a temporary script entry
    await pool.query(
      `INSERT INTO "Script" (id, name, description, language, code, "userId", "browserType", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'chromium'), now(), now())`,
      [tempScriptId, 'Current Script (Temp)', 'Temporary script for direct execution', language, code, userId, browser ?? null]
    );

    const testRunId = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO "TestRun" (id, "scriptId", "userId", status, environment, browser, "startedAt")
       VALUES ($1, $2, $3, 'running', COALESCE($4, 'development'), COALESCE($5, 'chromium'), now())
       RETURNING *`,
      [testRunId, tempScriptId, userId, environment ?? null, browser ?? null]
    );
    const testRun = rows[0];

    try {
      await allureService.startTest(testRun.id, `Current Script (${language})`);
    } catch (error) {
      console.error('Failed to start Allure test:', error);
    }

    // Execute Playwright script asynchronously
    executePlaywrightScript(testRun.id, code, `Current Script (${language})`, browser ?? 'chromium', environment ?? 'development').catch((error: any) => {
      console.error('Failed to execute Playwright script:', error);
    });

    // Return immediately with running status
    res.status(201).json({ success: true, data: testRun });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || 'Failed to execute current script' });
    }
  }
};

/**
 * Stop a test run
 */
export const stopTestRun = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;

    const exists = await pool.query(
      `SELECT id FROM "TestRun" WHERE id = $1 AND "userId" = $2`,
      [id, userId]
    );
    if (!exists.rowCount) throw new AppError('Test run not found', 404);

    const { rows } = await pool.query(
      `UPDATE "TestRun"
       SET status = 'cancelled', "completedAt" = now()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    res.status(200).json({ success: true, data: rows[0] });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || 'Failed to stop test run' });
    }
  }
};

/**
 * Get active test runs
 */
export const getActiveTestRuns = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;

    const { rows } = await pool.query(
      `SELECT tr.*, s.name AS script_name
       FROM "TestRun" tr
       JOIN "Script" s ON s.id = tr."scriptId"
       WHERE tr."userId" = $1 AND tr.status IN ('running','queued')
       ORDER BY tr."startedAt" DESC`,
      [userId]
    );

    const activeRuns = rows.map(r => ({ ...r, script: { name: r.script_name } }));

    res.status(200).json({ success: true, data: activeRuns });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to get active test runs' });
  }
};

/**
 * Update test run status and complete
 */
export const updateTestRun = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const { id } = req.params;
    const { status, errorMsg, duration, steps } = req.body;

    const existsRes = await pool.query(
      `SELECT tr.id, s.name AS script_name
       FROM "TestRun" tr JOIN "Script" s ON s.id = tr."scriptId"
       WHERE tr.id = $1 AND tr."userId" = $2`,
      [id, userId]
    );
    const existing = existsRes.rows[0];
    if (!existing) throw new AppError('Test run not found', 404);

    if (steps && Array.isArray(steps)) {
      for (const step of steps) {
        try {
          await allureService.recordStep(
            id,
            step.action || step.name || 'Step',
            step.status || 'passed',
            step.duration
          );
        } catch (error) {
          console.error('Failed to record Allure step:', error);
        }
      }
    }

    if (status && ['passed', 'failed', 'error'].includes(status)) {
      try {
        await allureService.endTest(
          id,
          status === 'error' ? 'broken' : status,
          errorMsg
        );

        // Generate Allure report when test completes
        await allureService.generateReport(id);
        const reportUrl = await allureService.getReportUrl(id);

        // Update with report URL
        const { rows } = await pool.query(
          `UPDATE "TestRun"
           SET status = COALESCE($2, status),
               "errorMsg" = $3,
               duration = $4,
               "executionReportUrl" = $5,
               "completedAt" = CASE WHEN $2 IN ('passed','failed','error','cancelled') THEN now() ELSE "completedAt" END
           WHERE id = $1
           RETURNING *`,
          [id, status ?? null, errorMsg ?? null, duration ?? null, reportUrl]
        );

        res.status(200).json({ success: true, data: rows[0] });
        return;
      } catch (error) {
        console.error('Failed to end Allure test or generate report:', error);
      }
    }

    const { rows } = await pool.query(
      `UPDATE "TestRun"
       SET status = COALESCE($2, status),
           "errorMsg" = $3,
           duration = $4,
           "completedAt" = CASE WHEN $2 IN ('passed','failed','error','cancelled') THEN now() ELSE "completedAt" END
       WHERE id = $1
       RETURNING *`,
      [id, status ?? null, errorMsg ?? null, duration ?? null]
    );

    res.status(200).json({ success: true, data: rows[0] });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || 'Failed to update test run' });
    }
  }
};

/**
 * Report a test result (create completed TestRun)
 */
export const reportTestResult = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    const {
      testName,
      status,
      duration,
      errorMsg,
      browser,
      environment,
      traceUrl,
      videoUrl,
      screenshotUrls
    } = req.body;

    if (!testName || !status) throw new AppError('testName and status are required', 400);

    let scriptRes = await pool.query(
      `SELECT id FROM "Script" WHERE "userId" = $1 AND name = $2`,
      [userId, testName]
    );
    let script = scriptRes.rows[0];

    if (!script) {
      const scriptId = randomUUID();
      const created = await pool.query(
        `INSERT INTO "Script" (id, name, description, language, code, "userId", "browserType", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'typescript', $4, $5, 'chromium', now(), now())
         RETURNING id`,
        [scriptId, testName, 'Auto-created from Playwright reporter', '// Recorded by Playwright reporter', userId]
      );
      script = created.rows[0];
    }

    const runId = randomUUID();
    const { rows } = await pool.query(
      `INSERT INTO "TestRun" (id, "scriptId", "userId", status, duration, "errorMsg", browser, environment, "traceUrl", "videoUrl", "screenshotUrls", "completedAt", "startedAt")
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'msedge'), COALESCE($8, 'development'), $9, $10, $11, now(), now())
       RETURNING *`,
      [runId, script.id, userId, status, duration ?? null, errorMsg ?? null, browser ?? null, environment ?? null, traceUrl ?? null, videoUrl ?? null, screenshotUrls ?? null]
    );

    res.status(201).json({ success: true, data: rows[0] });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
    } else {
      res.status(500).json({ success: false, error: error.message || 'Failed to report test result' });
    }
  }
};

/**
 * Helper method to execute Playwright script with proper error handling and reporting
 */
async function executePlaywrightScript(
  testRunId: string,
  code: string,
  _scriptName: string,
  browser: string,
  _environment: string
): Promise<void> {
  try {
    // Update status to running
    await pool.query(`UPDATE "TestRun" SET status = 'running' WHERE id = $1`, [testRunId]);

    // Execute Playwright script
    const result = await playwrightExecutorService.executeScript(code, testRunId, {
      headless: true,
      browserType: browser as any,
      screenshotOnFailure: true
    });

    // Record Allure steps
    for (const step of result.steps) {
      await allureService.recordStep(testRunId, step.action, step.status, step.duration);
    }

    // End Allure test and generate report
    const finalStatus = result.success ? 'passed' : 'failed';
    await allureService.endTest(testRunId, finalStatus, result.error);
    await allureService.generateReport(testRunId);
    const reportUrl = await allureService.getReportUrl(testRunId);

    // Update test run with results
    await pool.query(
      `UPDATE "TestRun"
       SET status = $1,
           "completedAt" = now(),
           duration = $2,
           "errorMsg" = $3,
           "executionReportUrl" = $4
       WHERE id = $5`,
      [finalStatus, result.duration, result.error || null, reportUrl, testRunId]
    );

    console.log(`✅ Test execution ${testRunId} completed with status: ${finalStatus}`);
  } catch (error: any) {
    console.error(`❌ Test execution ${testRunId} failed:`, error);

    // Update as failed
    await pool.query(
      `UPDATE "TestRun"
       SET status = 'failed',
           "completedAt" = now(),
           "errorMsg" = $1
       WHERE id = $2`,
      [error?.message || String(error), testRunId]
    ).catch(() => {});

    await allureService.endTest(testRunId, 'broken', error?.message);
    await allureService.generateReport(testRunId);
  }
}

