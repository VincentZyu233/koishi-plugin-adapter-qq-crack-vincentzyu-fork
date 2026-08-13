import { Context, icons } from '@koishijs/client'
import PanelSettings from './settings.vue'
import CommandPanelIcon from './icons/command-panel.vue'

export default (ctx: Context) => {
  icons.register('activity:qq-command-panel', CommandPanelIcon)

  ctx.page({
    id: 'qq-command-panel',
    name: 'QQ 指令面板',
    path: '/qq-command-panel',
    component: PanelSettings,
    icon: 'activity:qq-command-panel',
    order: 420,
  })
}
