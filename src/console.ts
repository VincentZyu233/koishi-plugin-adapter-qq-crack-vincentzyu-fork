import { resolve } from 'node:path'
import type { Context } from 'koishi'
import type { QQBot } from './bot'
import type { CommandPanelPreference, PanelCommand } from './command-panel'
import type * as QQ from './types'

export interface PanelState {
  preference: CommandPanelPreference
  commands: PanelCommand[]
  menu: QQ.GlobalMenuRecord
  mode: string
}

const registered = new WeakSet<Context>()

export function registerCommandPanelConsole(ctx: Context, bot: QQBot) {
  if (registered.has(ctx)) return
  registered.add(ctx)
  ctx.inject(['console'], (ctx: any) => {
    ctx.console.addEntry({
      dev: resolve(__dirname, '../client/index.ts'),
      prod: resolve(__dirname, '../dist'),
    })
    const findBot = (botId: string) => {
      const candidate = ctx.bots[botId] as QQBot | undefined
      if (!candidate?.commandPanels) throw new Error('找不到已启用指令面板的 QQ 机器人')
      return candidate
    }
    ctx.console.addListener('qq-crack/panel-bots', async () => {
      return (Object.values(ctx.bots) as QQBot[])
        .filter(candidate => candidate.platform === 'qq' && Boolean(candidate.commandPanels))
        .map(candidate => ({ id: candidate.selfId, name: candidate.user?.name || candidate.selfId }))
    }, { authority: 3 })
    ctx.console.addListener('qq-crack/panel-state', async ({ botId }) => {
      const target = findBot(botId)
      return {
        preference: await target.commandPanels.getPreference(),
        commands: await target.commandPanels.preview(),
        menu: await target.commandPanels.getMenu(),
        mode: target.config.commandPanelMode,
      }
    }, { authority: 3 })
    ctx.console.addListener('qq-crack/panel-save', async ({ botId, commands, scopes }) => {
      await findBot(botId).commandPanels.savePreference(commands, scopes)
    }, { authority: 3 })
    ctx.console.addListener('qq-crack/panel-sync', async ({ botId }) => {
      await findBot(botId).commandPanels.sync()
    }, { authority: 3 })
    ctx.console.addListener('qq-crack/menu-save', async ({ botId, menu }) => {
      return findBot(botId).commandPanels.updateMenu(menu)
    }, { authority: 3 })
  })
}
