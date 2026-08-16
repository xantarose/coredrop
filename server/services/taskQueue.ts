interface QueueTask {
  id: string;
  execute: () => Promise<void>;
  priority: number;
}

class TaskQueue {
  private queue: QueueTask[] = [];
  private processing = false;
  private maxConcurrent = 2;
  private activeCount = 0;

  add(task: QueueTask): void {
    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);
    this.process();
  }

  private async process(): Promise<void> {
    if (this.processing || this.activeCount >= this.maxConcurrent) {
      return;
    }

    if (this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      const task = this.queue.shift();
      if (!task) break;

      this.activeCount++;

      task.execute()
        .catch((error) => {
          console.error(`Task ${task.id} failed:`, error);
        })
        .finally(() => {
          this.activeCount--;
          this.process();
        });
    }

    this.processing = false;
  }
}

export const restoreQueue = new TaskQueue();
export const deleteQueue = new TaskQueue();
