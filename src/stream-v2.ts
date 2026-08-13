import * as QQ from './types';
import type { QQBot } from './bot';

export interface StreamOptions
{
  userId: string;
  msgId?: string;
  eventId?: string;
  msgSeq?: number;
  contentType?: 'text' | 'markdown';
  inputMode?: 'append' | 'replace';
  isWakeup?: boolean;
}

export class QQStream
{
  private id?: string;
  private index = 0;
  private ended = false;

  constructor(private bot: QQBot, private options: StreamOptions) { }

  async write(content: string)
  {
    if (this.ended) throw new Error('stream has already ended');
    const response = await this.bot.internal.sendStreamMessage(this.options.userId, {
      input_mode: this.options.inputMode ?? 'append',
      input_state: 1,
      content_type: this.options.contentType ?? 'markdown',
      content_raw: content,
      msg_id: this.options.msgId,
      event_id: this.options.eventId,
      msg_seq: this.options.msgSeq,
      stream_msg_id: this.id,
      index: this.index++,
      is_wakeup: this.options.isWakeup,
    });
    this.id ??= response.id;
    return response;
  }

  async end(content = '')
  {
    if (this.ended) return;
    const response = await this.bot.internal.sendStreamMessage(this.options.userId, {
      input_mode: this.options.inputMode ?? 'append',
      input_state: 10,
      content_type: this.options.contentType ?? 'markdown',
      content_raw: content,
      msg_id: this.options.msgId,
      event_id: this.options.eventId,
      msg_seq: this.options.msgSeq,
      stream_msg_id: this.id,
      index: this.index++,
      is_wakeup: this.options.isWakeup,
    });
    this.id ??= response.id;
    this.ended = true;
    return response;
  }
}
