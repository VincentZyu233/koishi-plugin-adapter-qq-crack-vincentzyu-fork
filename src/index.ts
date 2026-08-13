import { Context, Session } from 'koishi';
import * as QQ from './types';
import { QQBot } from './bot';
import { GroupInternal, GuildInternal } from './internal';
import { registerCommandPanelConsole } from './console';

export { QQ };

export * from './bot';
export * from './logger';
export * from './message';
export * from './utils';
export * from './ws';
export * from './stream-v2';
export * from './command-panel';

export const name = 'adapter-qq-crack';
export const reusable = true;
export const filter = false;
export const inject = QQBot.inject;
export const Config = QQBot.Config;

export function apply(ctx: Context, config: QQBot.Config)
{
  // 独立页面始终注册；未启用面板的机器人会在页面中提示配置条件。
  registerCommandPanelConsole(ctx);
  return new QQBot(ctx, config);
}

export default {
  name,
  reusable,
  filter,
  inject,
  Config,
  apply,
};

type ParamCase<S extends string> =
  | S extends `${infer L}${infer R}`
  ? `${L extends '_' ? '-' : Lowercase<L>}${ParamCase<R>}`
  : S;

type QQEvents = {
  [T in keyof QQ.GatewayEvents as `qq/${ParamCase<T>}`]: (input: QQ.GatewayEvents[T]) => void
};

declare module '@satorijs/core' {
  interface Session
  {
    qq?: QQ.Payload & GroupInternal;
    qqguild?: QQ.Payload & GuildInternal;
  }
}

declare module 'cordis' {
  interface Events extends QQEvents
  {
    'group-msg-receive'(session: Session): void;
    'group-msg-reject'(session: Session): void;
  }
}
