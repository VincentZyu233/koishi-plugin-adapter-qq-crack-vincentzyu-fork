import { Schema } from 'koishi';
import { WsClient } from './ws';
import * as QQ from './types';
import { HttpServer } from './http';

type IntentKey = keyof typeof QQ.Intents;

const defaultIntentKeys = [
  'GUILDS',
  'GUILD_MEMBER_ADD',
  'GUILD_MEMBER_REMOVE',
  'GUILD_MEMBERS',
  'GUILD_MESSAGE_REACTIONS',
  'DIRECT_MESSAGES',
  'OPEN_FORUMS_EVENT',
  'AUDIO_OR_LIVE_CHANNEL_MEMBER',
  'GROUP_AND_C2C_EVENT',
  'INTERACTIONS',
  'MESSAGE_AUDIT',
  'AUDIO_ACTION',
  'PUBLIC_GUILD_MESSAGES',
] as const satisfies readonly IntentKey[];

const defaultIntents = defaultIntentKeys.reduce((value, intent) => value | QQ.Intents[intent], 0);

export interface BaseConfig extends QQ.Options
{
  intents?: number;
  retryWhen: number[];
  manualAcknowledge: boolean;
  loggerinfo: boolean;
  autoStreamText: number;
  streamDefaultBehavior: QQ.StreamDefaultBehavior;
  streamSimulationChunkSize: number;
  streamSimulationInterval: number;
  enableCommandPanel: boolean;
  commandPanelMode: 'manual' | 'alphabetical-first' | 'alphabetical-last' | 'random';
  commandPanelScopes: Array<'c2c' | 'group'>;
  useMarkdownIfAt: boolean;
  disableUserNamePersist: boolean;
  userInfoApi?: string;
  protocol: 'websocket' | 'webhook';
  path?: string;
  gatewayUrl?: string;
}

export type Config = BaseConfig & (HttpServer.Options | WsClient.Options);

export const Config: Schema<Config> = Schema.intersect([
  Schema.object({
    id: Schema.string().description('机器人ID（AppID）。').required(),
    secret: Schema.string().description('机器人密钥（secret）。').role('secret'),
    type: Schema.union(['public', 'private'] as const).description('机器人类型。').default('private'),
    intents: Schema.bitset(QQ.Intents).description('需要订阅的机器人事件。').default(defaultIntents),
    retryWhen: Schema.array(Number).description('发送消息遇到平台错误码时重试。').default([]),
    protocol: Schema.union(['websocket', 'webhook']).description('选择要使用的协议。').default('websocket'),
  }),
  Schema.union([
    Schema.intersect([
      Schema.object({
        protocol: Schema.const('websocket').required(false),
      }),
      WsClient.Options,
      Schema.object({}),
    ]),
    Schema.intersect([
      Schema.object({
        protocol: Schema.const('webhook').required(false),
      }),
      HttpServer.Options,
      Schema.object({}),
    ]),
  ]),
  Schema.object({
    sandbox: Schema.boolean().description('是否开启沙箱模式。').default(false),
    endpoint: Schema.string().role('link').description('要连接的服务器地址。').default('https://api.bot.qq.com/'),
    manualAcknowledge: Schema.boolean().description('手动响应回调消息。').default(false),
    gatewayUrl: Schema.string().role('link').description('覆盖 WebSocket 地址。'),
    userInfoApi: Schema.string().role("link").default("https://oiapi.net/api/Openid").description("API 接口地址"),
  }).description('进阶设置'),
  Schema.object({
    autoStreamText: Schema.bitset(QQ.AutoStreamText).description('自动流式消息场景。旧版兼容选项不属于当前公开 API 保证范围。').default(QQ.AutoStreamText.私聊官方V2),
    streamDefaultBehavior: Schema.union(['normal', 'instant', 'simulate'] as const).description('官方 V2 流式的默认行为。normal 保持普通发送，instant 立即发送生成和结束包，simulate 模拟逐段展示。').default('normal'),
    streamSimulationChunkSize: Schema.natural().min(1).description('模拟逐段时每段字符数。').default(80),
    streamSimulationInterval: Schema.natural().min(0).description('模拟逐段时相邻分片间隔，单位毫秒。').default(200),
    enableCommandPanel: Schema.boolean().description('启用 QQ 指令面板管理与命令同步。').default(false),
    commandPanelMode: Schema.union(['manual', 'alphabetical-first', 'alphabetical-last', 'random'] as const).description('自动选择 Koishi 指令的方式。manual 由 Console 页面管理。').default('manual'),
    commandPanelScopes: Schema.array(Schema.union(['c2c', 'group'] as const)).role('checkbox').description('自动同步的指令面板场景。').default(['c2c', 'group']),
    useMarkdownIfAt: Schema.boolean().description('在包含 `<at>` 元素时使用 Markdown 格式，禁用将忽略 `<at>` 元素。').default(true),
    loggerinfo: Schema.boolean().default(false).description('调试模式').experimental(),
    disableUserNamePersist: Schema.boolean().default(false).description('禁用将消息中的用户名写入数据库（调试用）。').experimental(),
  }).description('高级设置'),
] as const);
