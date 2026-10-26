export interface Job {
  name: string;
  run: () => Promise<void>;
}

const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 60_000;

const deadLetter: { job: string; error: string; failedAt: string }[] = [];

export function deadLetters() {
  return [...deadLetter];
}

export async function runWithRetries(job: Job, wait = (ms: number) => new Promise((r) => setTimeout(r, ms))) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await job.run();
      return;
    } catch (error) {
      if (attempt === MAX_ATTEMPTS) {
        deadLetter.push({ job: job.name, error: String(error), failedAt: new Date().toISOString() });
        return;
      }
      await wait(RETRY_DELAY_MS);
    }
  }
}
