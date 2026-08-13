import { resolve } from 'node:path'
import type { Context } from 'koishi'
import type { QQBot } from './bot'
import type { CommandPanelPreference, PanelCommand } from './command-panel'
import type * as QQ from './types'

export interface PanelState {
  preference: CommandPanelPreference
  commands: PanelCommand[]
  menu?: QQ.GlobalMenuRecord
  menuError?: string
  mode: string
}

const registered = new WeakSet<Context>()

export function registerCommandPanelConsole(ctx: Context) {
  if (registered.has(ctx)) return
  registered.add(ctx)
  ctx.inject(['console'], (ctx: any) => {
    ctx.console.addEntry({
      dev: resolve(__dirname, '../client/index.ts'),
      prod: resolve(__dirname, '../dist'),
    })
    const findBot = (botId: string) => {
      const candidate = ctx.bots.find((bot: QQBot) => bot.platform === 'qq' && bot.config?.id === botId) as QQBot | undefined
      if (!candidate) throw new Error('找不到指定的 QQ 机器人')
      candidate.ensureCommandPanelService()
      if (!candidate.commandPanels) throw new Error('该 QQ 机器人的 enableCommandPanel 已显式关闭')
      return candidate
    }
    ctx.console.addListener('qq-crack/panel-bots', async () => {
      return ctx.bots
        .filter((candidate: QQBot) => candidate.platform === 'qq')
        .map((candidate: QQBot) => ({
          id: candidate.config.id,
          name: candidate.user?.name || `QQ Bot ${candidate.config.id}`,
          enabled: candidate.config.enableCommandPanel !== false,
        }))
    }, { authority: 3 })
    ctx.console.addListener('qq-crack/panel-state', async ({ botId }) => {
      const target = findBot(botId)
      let menu: QQ.GlobalMenuRecord | undefined
      let menuError: string | undefined
      try {
        menu = await target.commandPanels.getMenu()
      } catch (error) {
        menuError = error instanceof Error ? error.message : String(error)
      }
      return {
        preference: await target.commandPanels.getPreference(),
        commands: await target.commandPanels.preview(),
        menu,
        menuError,
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
