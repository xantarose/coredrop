class OperationQueue {
  async add<T>(
    operation: () => Promise<T>,
    priority: number = 0,
    retries: number = 0
  ): Promise<T> {
    return operation();
  }

  getQueueSize(): number {
    return 0;
  }

  getActiveCount(): number {
    return 0;
  }
}

export const globalOperationQueue = new OperationQueue();
