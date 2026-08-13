import type { Context } from '@koishijs/client'
import PanelSettings from './settings.vue'

export default (ctx: Context) => {
  ctx.page({
    name: 'QQ 指令面板',
    path: '/qq-command-panel',
    component: PanelSettings,
    icon: 'list',
    order: 420,
  })
}
