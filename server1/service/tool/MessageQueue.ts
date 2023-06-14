// eslint-disable-next-line import/no-extraneous-dependencies
import NodeCache from 'node-cache';

export default class MessageQueue {
  private myCache;

  constructor(ttlinseconds: number) {
    this.myCache = new NodeCache({ stdTTL: ttlinseconds, checkperiod: 20 });
  }

  async push(cacheKey: string, dataObject: object, ttlInSeconds: number): Promise<boolean> {
    console.log(`[MessageQueue] push:${cacheKey}`);
    return this.myCache.set(cacheKey, dataObject, ttlInSeconds);
  }

  async get(cacheKey: string): Promise<any> {
    console.log(`[MessageQueue] get:${cacheKey}`);
    return this.myCache.get(cacheKey);
  }

  length(): number {
    return this.myCache.keys().length;
  }
}
