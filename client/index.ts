import type { Context } from '@koishijs/client'
import PanelSettings from './settings.vue'

export default (ctx: Context) => {
  ctx.slot({ type: 'plugin-details', component: PanelSettings, order: 0 })
}
