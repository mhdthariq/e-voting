import fs from "fs";
import path from "path";

/**
 * simple File-based Mutex for preventing race conditions
 * Useful for synchronizing file writes across multiple processes/requests
 */
export class FileMutex {
  private lockPath: string;
  private retryInterval: number;
  private maxRetries: number;
  private staleTimeout: number;

  constructor(lockName: string, directory: string = "./data") {
    this.lockPath = path.join(directory, `${lockName}.lock`);
    this.retryInterval = 100; // ms
    this.maxRetries = 50; // 5 seconds total
    this.staleTimeout = 10000; // 10 seconds considered stale
  }

  /**
   * Acquire the lock. Throws if unable to acquire.
   */
  async acquire(): Promise<void> {
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        // Try to create the lock directory if it doesn't exist
        const dir = path.dirname(this.lockPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Exclusive creation - fails if file exists
        // 'wx' flag: Open file for writing. The file is created (if it does not exist) or fails (if it exists).
        const fd = fs.openSync(this.lockPath, "wx");
        
        // Write PID and time for debugging/stale check
        fs.writeSync(fd, JSON.stringify({ pid: process.pid, time: Date.now() }));
        fs.closeSync(fd);
        
        return; // Lock acquired
      } catch (error: any) {
        if (error.code === "EEXIST") {
            // Lock exists, check if stale
            this.checkStale();
            
            // Wait and retry
            await new Promise(resolve => setTimeout(resolve, this.retryInterval));
            continue;
        }
        throw error;
      }
    }
    throw new Error(`Failed to acquire lock for ${this.lockPath} after ${this.maxRetries} attempts`);
  }

  /**
   * Release the lock
   */
  release(): void {
    try {
      if (fs.existsSync(this.lockPath)) {
        fs.unlinkSync(this.lockPath);
      }
    } catch (error) {
      console.error(`Failed to release lock: ${this.lockPath}`, error);
    }
  }

  /**
   * Check if the lock is stale (process crashed) and remove it if so
   */
  private checkStale(): void {
    try {
        if (fs.existsSync(this.lockPath)) {
          const content = fs.readFileSync(this.lockPath, 'utf8');
          try {
            const data = JSON.parse(content);
            if (Date.now() - data.time > this.staleTimeout) {
                console.warn(`Removing stale lock: ${this.lockPath}`);
                try {
                   fs.unlinkSync(this.lockPath); 
                } catch (e) { /* Ignore race conditions on verify */ }
            }
          } catch(e) {
             // Invalid content, remove it
             try { fs.unlinkSync(this.lockPath); } catch (e) {}
          }
        }
    } catch(e) {
        // Ignore read errors
    }
  }

  /**
   * Run a task within the lock
   */
  async run<T>(task: () => Promise<T> | T): Promise<T> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }
}
