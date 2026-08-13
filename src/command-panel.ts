import { Context, Universal } from 'koishi'
import * as QQ from './types'
import type { QQBot } from './bot'

export const PANEL_REMARK = 'koishi-adapter-qq-crack:managed'

declare module 'koishi' {
  interface Tables {
    qq_command_panel: CommandPanelPreference
  }
}

export interface CommandPanelPreference {
  id: number
  botId: string
  commands: string[]
  scopes: Array<'c2c' | 'group'>
}

export interface PanelCommand {
  name: string
  description: string
  reason?: string
  selected: boolean
}

let modelRegistered = false

export function registerCommandPanelModel(ctx: Context) {
  if (modelRegistered) return
  modelRegistered = true
  ctx.model.extend('qq_command_panel', {
    id: 'unsigned',
    botId: 'string',
    commands: 'list',
    scopes: 'list',
  }, { autoInc: true, unique: ['botId'] })
}

function qqLength(value: string) {
  return [...value].reduce((total, char) => total + (char.charCodeAt(0) <= 0x7f ? 1 : 2), 0)
}

function getCandidates(bot: QQBot) {
  const commander = (bot.ctx as Context & { $commander?: { _commandList?: Array<any> } }).$commander
  return (commander?._commandList ?? [])
    .filter(command => !command.name.includes('.') && command.config?.slash)
    .map(command => {
      const json = command.toJSON() as Universal.Command
      const name = json.name
      const description = json.description?.[''] || name
      const reason = qqLength(name) > 14
        ? '指令名超过 QQ 面板 14 字符限制'
        : qqLength(description) > 30
          ? '指令说明超过 QQ 面板 30 字符限制'
          : undefined
      return { name, description, reason }
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
}

export class CommandPanelService {
  private randomSelection?: string[]

  constructor(private bot: QQBot) {}

  async preview(): Promise<PanelCommand[]> {
    const candidates = getCandidates(this.bot)
    const valid = candidates.filter(command => !command.reason)
    const preference = await this.getPreference()
    const selectedNames = await this.getSelectedNames(valid.map(command => command.name), preference)
    const selected = new Set(selectedNames)
    return candidates.map(command => ({ ...command, selected: selected.has(command.name) }))
  }

  async sync(): Promise<void> {
    if (!this.bot.config.enableCommandPanel) return
    const preference = await this.getPreference()
    const preview = await this.preview()
    const commands = preview.filter(command => command.selected && !command.reason).slice(0, 20)
    if (!commands.length) throw new Error('没有可同步的 QQ 指令面板指令')
    const scopes = this.bot.config.commandPanelMode === 'manual'
      ? preference.scopes
      : this.bot.config.commandPanelScopes
    const panel: QQ.CommandPanel = {
      remark: PANEL_REMARK,
      items: commands.map(command => ({ type: 'command', name: command.name, desc: command.description })),
    }
    for (const scope of scopes) {
      const records = await this.listAll(scope)
      const managed = records.find(record => record.panel.remark === PANEL_REMARK)
      if (managed) await this.bot.internal.updateCommandPanel(managed.panel_id, { panel })
      else await this.bot.internal.createCommandPanel({ scope, target_type: 'all', panel })
    }
  }

  async getPreference(): Promise<CommandPanelPreference> {
    const [preference] = await this.bot.ctx.database.get('qq_command_panel', { botId: this.bot.selfId })
    return preference ?? { id: 0, botId: this.bot.selfId, commands: [], scopes: this.bot.config.commandPanelScopes }
  }

  async savePreference(commands: string[], scopes: Array<'c2c' | 'group'>) {
    const allowed = new Set(getCandidates(this.bot).map(command => command.name))
    const unique = [...new Set(commands)].filter(name => allowed.has(name)).slice(0, 20)
    const [existing] = await this.bot.ctx.database.get('qq_command_panel', { botId: this.bot.selfId })
    const data = { botId: this.bot.selfId, commands: unique, scopes }
    if (existing) await this.bot.ctx.database.set('qq_command_panel', { id: existing.id }, data)
    else await this.bot.ctx.database.create('qq_command_panel', data)
  }

  async getMenu() {
    return this.bot.internal.getGlobalMenu()
  }

  async updateMenu(menu: QQ.GlobalMenu | undefined) {
    return this.bot.internal.updateGlobalMenu({ menu })
  }

  private async getSelectedNames(validNames: string[], preference: CommandPanelPreference) {
    if (this.bot.config.commandPanelMode === 'manual') return preference.commands
    if (this.bot.config.commandPanelMode === 'alphabetical-last') return validNames.slice(-20)
    if (this.bot.config.commandPanelMode === 'random') {
      this.randomSelection ??= shuffle(validNames).slice(0, 20)
      return this.randomSelection
    }
    return validNames.slice(0, 20)
  }

  private async listAll(scope: QQ.CommandPanelRecord['scope']) {
    const records: QQ.CommandPanelRecord[] = []
    let cursor = ''
    do {
      const result = await this.bot.internal.getCommandPanels({ scope, cursor, limit: 50 })
      records.push(...result.records)
      cursor = result.is_end ? '' : result.next_cursor
    } while (cursor)
    return records
  }
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index--) {
    const replacement = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[replacement]] = [result[replacement], result[index]]
  }
  return result
}
