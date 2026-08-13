<template>
  <div v-if="isCurrentPlugin" class="panel">
    <div class="header">
      <div><h3>QQ 指令面板</h3><p>只会更新由本插件创建的面板。</p></div>
      <k-button @click="load" :disabled="loading">刷新</k-button>
    </div>
    <label class="field">机器人
      <select v-model="botId" @change="load"><option v-for="bot in bots" :key="bot.id" :value="bot.id">{{ bot.name }} / {{ bot.id }}</option></select>
    </label>
    <p v-if="state" class="hint">当前模式：{{ state.mode }}。自动模式的勾选由配置生成；手动模式可在此保存选择。</p>
    <div v-if="state" class="commands">
      <label v-for="command in state.commands" :key="command.name" class="command" :class="{ invalid: command.reason }">
        <input v-model="selected" type="checkbox" :value="command.name" :disabled="Boolean(command.reason) || state.mode !== 'manual'" />
        <span><strong>{{ command.name }}</strong><small>{{ command.description }}</small><em v-if="command.reason">{{ command.reason }}</em></span>
      </label>
    </div>
    <div class="actions"><k-button type="primary" @click="save" :disabled="!state || state.mode !== 'manual'">保存手动选择</k-button><k-button type="primary" @click="sync" :disabled="!state">同步到 QQ</k-button></div>
    <section v-if="state" class="menu"><h4>单聊全局菜单</h4><textarea v-model="menuJson" rows="12" spellcheck="false" /><k-button @click="saveMenu">保存菜单</k-button></section>
    <k-comment v-if="message" :type="message.ok ? 'success' : 'error'">{{ message.text }}</k-comment>
  </div>
</template>

<script setup lang="ts">
import { send } from '@koishijs/client'
import { computed, inject, onMounted, ref } from 'vue'

interface Command { name: string, description: string, reason?: string, selected: boolean }
interface State { preference: { scopes: Array<'c2c' | 'group'> }, commands: Command[], menu: { menu?: unknown }, mode: string }
const local: any = inject('manager.settings.local')
const isCurrentPlugin = computed(() => (local?.value?.name || '').includes('adapter-qq-crack-vincentzyu-fork'))
const bots = ref<Array<{ id: string, name: string }>>([])
const botId = ref('')
const state = ref<State>()
const selected = ref<string[]>([])
const menuJson = ref('{\n  "items": []\n}')
const loading = ref(false)
const message = ref<{ ok: boolean, text: string }>()

async function load() {
  if (!botId.value) return
  loading.value = true; message.value = undefined
  try {
    state.value = await send('qq-crack/panel-state' as any, { botId: botId.value })
    selected.value = state.value.commands.filter(command => command.selected).map(command => command.name)
    menuJson.value = JSON.stringify(state.value.menu.menu || { items: [] }, null, 2)
  } catch (error) { message.value = { ok: false, text: String(error) } } finally { loading.value = false }
}
async function save() {
  try { await send('qq-crack/panel-save' as any, { botId: botId.value, commands: selected.value, scopes: state.value!.preference.scopes }); message.value = { ok: true, text: '手动选择已保存' } } catch (error) { message.value = { ok: false, text: String(error) } }
}
async function sync() {
  try { await send('qq-crack/panel-sync' as any, { botId: botId.value }); message.value = { ok: true, text: 'QQ 指令面板已同步' } } catch (error) { message.value = { ok: false, text: String(error) } }
}
async function saveMenu() {
  try {
    await send('qq-crack/menu-save' as any, { botId: botId.value, menu: JSON.parse(menuJson.value) })
    message.value = { ok: true, text: '单聊全局菜单已保存' }
  } catch (error) {
    message.value = { ok: false, text: error instanceof Error ? error.message : String(error) }
  }
}
onMounted(async () => { bots.value = await send('qq-crack/panel-bots' as any); botId.value = bots.value[0]?.id || ''; await load() })
</script>

<style lang="scss" scoped>
.panel { display: flex; flex-direction: column; gap: 14px; padding: 16px 0; max-width: 760px; }
.header, .actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
h3, h4, p { margin: 0; } p, .hint, small { color: var(--k-color-muted); } .field { display: flex; flex-direction: column; gap: 6px; font-weight: 600; } select, textarea { box-sizing: border-box; width: 100%; border: 1px solid var(--k-color-border); border-radius: 6px; padding: 8px; color: var(--k-color-fg); background: var(--k-color-bg); font: inherit; }
.commands { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 8px; }.command { display: flex; gap: 9px; padding: 9px; border: 1px solid var(--k-color-border); border-radius: 6px; }.command span { display: flex; flex-direction: column; gap: 3px; min-width: 0; }.command strong, .command small, .command em { overflow-wrap: anywhere; }.command em { color: var(--k-color-danger); font-style: normal; font-size: 12px; }.invalid { opacity: .65; }.menu { display: flex; flex-direction: column; gap: 8px; } textarea { font-family: ui-monospace, monospace; resize: vertical; }
</style>
